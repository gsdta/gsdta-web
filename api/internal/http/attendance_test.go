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

type attendance struct {
	ID      string           `json:"id"`
	ClassID string           `json:"classId"`
	Date    string           `json:"date"`
	Records []map[string]any `json:"records"`
}

type putReq struct {
	Records        []map[string]any `json:"records"`
	MarkAllPresent bool             `json:"markAllPresent"`
}

func TestAttendance_MarkAllPresent_And_Update(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)
	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	teacher := headerUser("teacher1", "teacher", "t@example.com", "Teacher")

	// Setup class with teacher and two enrolled students
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

	// Create guardian and two students, enroll both
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
	rec = post(h, "/v1/students", admin, map[string]any{"guardianId": gid, "firstName": "S2", "lastName": "L"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("s2 201 got %d", rec.Code)
	}
	var s2 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &s2)
	s2id := s2["id"].(string)
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply 201 got %d", rec.Code)
	}
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s2id, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply 201 got %d", rec.Code)
	}

	date := time.Now().UTC().Format("2006-01-02")

	// Mark all present by teacher
	rec = post(h, "/v1/classes/"+classID+"/attendance/"+date, teacher, putReq{MarkAllPresent: true})
	if rec.Code != http.StatusOK {
		t.Fatalf("markAllPresent expected 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var a attendance
	_ = json.Unmarshal(rec.Body.Bytes(), &a)
	if len(a.Records) != 2 {
		t.Fatalf("expected 2 records got %d", len(a.Records))
	}

	// Update one student to Late is idempotent
	rec = post(h, "/v1/classes/"+classID+"/attendance/"+date, teacher, putReq{Records: []map[string]any{{"studentId": s1id, "status": "late"}}})
	if rec.Code != http.StatusOK {
		t.Fatalf("update one expected 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &a)
	if len(a.Records) != 2 {
		t.Fatalf("expected 2 records after update got %d", len(a.Records))
	}
	var seenLate bool
	for _, r := range a.Records {
		if r["studentId"].(string) == s1id && r["status"].(string) == "late" {
			seenLate = true
		}
	}
	if !seenLate {
		t.Fatalf("expected s1 to be late")
	}

	// GET attendance returns current state
	rec = get(h, "/v1/classes/"+classID+"/attendance/"+date, teacher)
	if rec.Code != http.StatusOK {
		t.Fatalf("get attendance expected 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &a)
	if len(a.Records) != 2 {
		t.Fatalf("expected 2 records on get got %d", len(a.Records))
	}
}
