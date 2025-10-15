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

type eventResp struct {
	ID       string    `json:"id"`
	Title    string    `json:"title"`
	Start    time.Time `json:"start"`
	End      time.Time `json:"end"`
	Location string    `json:"location"`
	Capacity int       `json:"capacity"`
}

type eventReg struct {
	ID        string `json:"id"`
	EventID   string `json:"eventId"`
	StudentID string `json:"studentId"`
	Status    string `json:"status"`
}

type regList struct {
	Items []eventReg `json:"items"`
	Total int        `json:"total"`
}

func TestEventRegistration_Capacity_Waitlist_Promotion(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	parent := headerUser("parent1", "parent", "p@example.com", "Parent")

	// Create event (capacity 2)
	eIn := map[string]any{"title": "Recital", "start": time.Now().UTC(), "end": time.Now().UTC().Add(time.Hour), "location": "Hall", "capacity": 2}
	rec := post(h, "/v1/events", admin, eIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create event 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var ev eventResp
	_ = json.Unmarshal(rec.Body.Bytes(), &ev)
	if ev.ID == "" {
		t.Fatalf("missing event id")
	}

	// Create guardian and three students
	rec = post(h, "/v1/guardians", admin, map[string]any{"userId": "parent1", "phone": "+1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("guardian 201 got %d", rec.Code)
	}
	var g map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &g)
	gid := g["id"].(string)
	sids := make([]string, 0, 3)
	for i := 1; i <= 3; i++ {
		rec = post(h, "/v1/students", admin, map[string]any{"guardianId": gid, "firstName": fmt.Sprintf("S%d", i), "lastName": "L"})
		if rec.Code != http.StatusCreated {
			t.Fatalf("student %d 201 got %d body=%s", i, rec.Code, rec.Body.String())
		}
		var s map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &s)
		sids = append(sids, s["id"].(string))
	}

	// Register three students: first two registered, third waitlisted
	regIDs := make([]string, 0, 3)
	statuses := make([]string, 0, 3)
	for i := 0; i < 3; i++ {
		rec = post(h, "/v1/events/"+ev.ID+"/registrations", parent, map[string]any{"studentId": sids[i]})
		if rec.Code != http.StatusCreated {
			t.Fatalf("register %d expected 201 got %d body=%s", i+1, rec.Code, rec.Body.String())
		}
		var r eventReg
		_ = json.Unmarshal(rec.Body.Bytes(), &r)
		regIDs = append(regIDs, r.ID)
		statuses = append(statuses, r.Status)
	}
	if statuses[0] != "registered" || statuses[1] != "registered" || statuses[2] != "waitlisted" {
		t.Fatalf("unexpected statuses %v", statuses)
	}

	// Admin list roster shows statuses
	rec = get(h, "/v1/events/"+ev.ID+"/registrations", admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("roster 200 got %d", rec.Code)
	}
	var list regList
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if list.Total != 3 {
		t.Fatalf("expected 3 registrations got %d", list.Total)
	}

	// Cancel first registration -> waitlist head promoted
	rec = post(h, "/v1/eventRegistrations/"+regIDs[0]+":cancel", parent, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("cancel 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var cancelResp map[string]eventReg
	_ = json.Unmarshal(rec.Body.Bytes(), &cancelResp)
	if cancelResp["cancelled"].Status != "cancelled" {
		t.Fatalf("expected cancelled status got %s", cancelResp["cancelled"].Status)
	}
	promoted, ok := cancelResp["promoted"]
	if !ok || promoted.Status != "registered" {
		t.Fatalf("expected promoted registered, got: %+v", cancelResp)
	}

	// Roster reflects promotion
	rec = get(h, "/v1/events/"+ev.ID+"/registrations", admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("roster 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	var countRegistered, countWaitlisted int
	for _, it := range list.Items {
		if it.Status == "registered" {
			countRegistered++
		}
		if it.Status == "waitlisted" {
			countWaitlisted++
		}
	}
	if countRegistered != 2 || countWaitlisted != 0 {
		t.Fatalf("expected 2 registered, 0 waitlisted got %d/%d", countRegistered, countWaitlisted)
	}
}
