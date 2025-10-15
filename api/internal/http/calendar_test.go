package apihttp

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

type calResp struct {
	Items []map[string]any `json:"items"`
}

func TestCalendar_Public_And_Mine(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)
	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	parent := headerUser("parent1", "parent", "p@example.com", "Parent")
	teacher := headerUser("teacher1", "teacher", "t@example.com", "Teacher")

	// Create term/campus/room/class (assign teacher)
	rec := post(h, "/v1/terms", admin, map[string]any{"name": "T1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("term 201 got %d", rec.Code)
	}
	var term map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &term)
	termID := term["id"].(string)
	rec = post(h, "/v1/campuses", admin, map[string]any{"name": "Main"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("campus 201 got %d", rec.Code)
	}
	var campus map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &campus)
	campusID := campus["id"].(string)
	rec = post(h, "/v1/rooms", admin, map[string]any{"campusId": campusID, "name": "R1", "capacity": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("room 201 got %d", rec.Code)
	}
	var room map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &room)
	roomID := room["id"].(string)
	classIn := map[string]any{"termId": termID, "campusId": campusID, "roomId": roomID, "teacherId": "teacher1", "level": "L1", "weekday": 3, "startHHMM": "10:00", "endHHMM": "11:00", "capacity": 10}
	rec = post(h, "/v1/classes", admin, classIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("class 201 got %d", rec.Code)
	}
	var cls map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls)
	classID := cls["id"].(string)

	// Create one event
	start := time.Now().UTC().AddDate(0, 0, 7).Truncate(time.Second)
	end := start.Add(2 * time.Hour)
	rec = post(h, "/v1/events", admin, map[string]any{"title": "Recital", "start": start, "end": end, "location": "Hall"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("event 201 got %d body=%s", rec.Code, rec.Body.String())
	}

	// Parent creates guardian+student and enrolls
	rec = post(h, "/v1/guardians", admin, map[string]any{"userId": "parent1", "phone": "+1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("guardian 201 got %d", rec.Code)
	}
	var g map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &g)
	gid := g["id"].(string)
	rec = post(h, "/v1/students", admin, map[string]any{"guardianId": gid, "firstName": "S1", "lastName": "L"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("s1 201 got %d", rec.Code)
	}
	var s1 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &s1)
	s1id := s1["id"].(string)
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply 201 got %d", rec.Code)
	}

	// Public calendar should include class and event
	rec = get(h, "/v1/calendar/public?termId="+termID, http.Header{})
	if rec.Code != http.StatusOK {
		t.Fatalf("calendar public 200 got %d", rec.Code)
	}
	var cr calResp
	_ = json.Unmarshal(rec.Body.Bytes(), &cr)
	if len(cr.Items) < 2 {
		t.Fatalf("expected at least class and event, got %d", len(cr.Items))
	}

	// Parent mine should include the class
	rec = get(h, "/v1/calendar/mine", parent)
	if rec.Code != http.StatusOK {
		t.Fatalf("calendar mine parent 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &cr)
	found := false
	for _, it := range cr.Items {
		if it["kind"] == "class" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected class item for parent")
	}

	// Teacher mine should include the class
	rec = get(h, "/v1/calendar/mine", teacher)
	if rec.Code != http.StatusOK {
		t.Fatalf("calendar mine teacher 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &cr)
	found = false
	for _, it := range cr.Items {
		if it["kind"] == "class" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected class item for teacher")
	}
}
