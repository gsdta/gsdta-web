package apihttp

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

func TestClasses_Validation_TimeAndCapacity(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")

	// Seed term/campus/room
	rec := post(h, "/v1/terms", admin, map[string]any{"name": "T1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("term got %d", rec.Code)
	}
	var term map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &term)
	rec = post(h, "/v1/campuses", admin, map[string]any{"name": "Main"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("campus got %d", rec.Code)
	}
	var campus map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &campus)
	rec = post(h, "/v1/rooms", admin, map[string]any{"campusId": campus["id"].(string), "name": "R1", "capacity": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("room got %d", rec.Code)
	}
	var room map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &room)

	// End time <= start time -> 400
	badTime := map[string]any{"termId": term["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "level": "L1", "weekday": 1, "startHHMM": "10:00", "endHHMM": "09:00", "capacity": 10}
	rec = post(h, "/v1/classes", admin, badTime)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("end<=start expected 400 got %d", rec.Code)
	}

	// Capacity <= 0 -> 400
	badCap := map[string]any{"termId": term["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "level": "L1", "weekday": 1, "startHHMM": "10:00", "endHHMM": "11:00", "capacity": 0}
	rec = post(h, "/v1/classes", admin, badCap)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("capacity<=0 expected 400 got %d", rec.Code)
	}
}
