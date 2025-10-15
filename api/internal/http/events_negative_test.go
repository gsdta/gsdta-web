package apihttp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

func TestEvents_NegativeFlows(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	parent1 := headerUser("parent1", "parent", "p1@example.com", "P1")
	parent2 := headerUser("parent2", "parent", "p2@example.com", "P2")

	// Create event (capacity 1)
	rec := post(h, "/v1/events", admin, map[string]any{"title": "Recital", "start": time.Now().UTC(), "end": time.Now().UTC().Add(time.Hour), "location": "Hall", "capacity": 1})
	if rec.Code != http.StatusCreated {
		t.Fatalf("event 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var ev map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &ev)
	eid := ev["id"].(string)

	// Guardians and students
	rec = post(h, "/v1/guardians", admin, map[string]any{"userId": "parent1", "phone": "+1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("g1 got %d", rec.Code)
	}
	var g1 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &g1)
	rec = post(h, "/v1/guardians", admin, map[string]any{"userId": "parent2", "phone": "+1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("g2 got %d", rec.Code)
	}
	var g2 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &g2)

	rec = post(h, "/v1/students", admin, map[string]any{"guardianId": g1["id"].(string), "firstName": "S1", "lastName": "L"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("s1 got %d", rec.Code)
	}
	var s1 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &s1)
	s1id := s1["id"].(string)

	// Duplicate registration by same student -> 400
	rec = post(h, fmt.Sprintf("/v1/events/%s/registrations", eid), parent1, map[string]any{"studentId": s1id})
	if rec.Code != http.StatusCreated {
		t.Fatalf("reg1 got %d body=%s", rec.Code, rec.Body.String())
	}
	rec = post(h, fmt.Sprintf("/v1/events/%s/registrations", eid), parent1, map[string]any{"studentId": s1id})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("duplicate expected 400 got %d", rec.Code)
	}

	// Invalid studentId -> 400
	rec = post(h, fmt.Sprintf("/v1/events/%s/registrations", eid), parent1, map[string]any{"studentId": "does-not-exist"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid student expected 400 got %d", rec.Code)
	}

	// Forbidden cancel by non-owning parent
	// Register again with capacity: cancel previous registration to free? We'll create another event for clarity
	rec = post(h, "/v1/events", admin, map[string]any{"title": "Show", "start": time.Now().UTC(), "end": time.Now().UTC().Add(time.Hour), "location": "Hall", "capacity": 2})
	if rec.Code != http.StatusCreated {
		t.Fatalf("event2 got %d", rec.Code)
	}
	var ev2 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &ev2)
	eid2 := ev2["id"].(string)
	rec = post(h, fmt.Sprintf("/v1/events/%s/registrations", eid2), parent1, map[string]any{"studentId": s1id})
	if rec.Code != http.StatusCreated {
		t.Fatalf("reg e2 got %d", rec.Code)
	}
	var reg map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &reg)
	regID := reg["id"].(string)

	// parent2 attempts to cancel parent1's registration -> 403
	rec = post(h, "/v1/eventRegistrations/"+regID+":cancel", parent2, nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("cancel by non-owner expected 403 got %d body=%s", rec.Code, rec.Body.String())
	}
}
