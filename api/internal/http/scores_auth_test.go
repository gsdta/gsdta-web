package apihttp

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store"
	"github.com/gsdta/api/internal/store/memory"
)

func TestScores_Read_Authorization(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	teacher := headerUser("teacher1", "teacher", "t@example.com", "Teacher")
	parent1 := headerUser("parent1", "parent", "p1@example.com", "P1")
	parent2 := headerUser("parent2", "parent", "p2@example.com", "P2")

	// Setup class
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
	rec = post(h, "/v1/classes", admin, map[string]any{"termId": term["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "teacherId": "teacher1", "level": "L1", "weekday": 2, "startHHMM": "09:00", "endHHMM": "10:00", "capacity": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("class got %d", rec.Code)
	}
	var cls map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls)
	classID := cls["id"].(string)

	// Create guardians/ students
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

	// Enroll student into the class and set status to enrolled
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply got %d", rec.Code)
	}
	ens, _, _ := st.Enrollments().List(context.Background(), store.ListOptions{})
	for _, e := range ens {
		if e.ClassID == classID && e.StudentID == s1id {
			e.Status = "enrolled"
			if _, err := st.Enrollments().Update(context.Background(), e); err != nil {
				t.Fatalf("enroll update: %v", err)
			}
		}
	}

	// Create an assessment and score for s1
	rec = post(h, "/v1/assessments", teacher, map[string]any{"classId": classID, "title": "Quiz", "date": time.Now().UTC(), "level": "L1", "maxScore": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("assessment got %d", rec.Code)
	}
	var a map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &a)
	rec = post(h, "/v1/assessments/"+a["id"].(string)+"/scores", teacher, []map[string]any{{"studentId": s1id, "value": 9}})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("scores got %d", rec.Code)
	}

	// parent1 can read
	rec = get(h, "/v1/students/"+s1id+"/scores", parent1)
	if rec.Code != http.StatusOK {
		t.Fatalf("parent1 read got %d", rec.Code)
	}

	// parent2 forbidden
	rec = get(h, "/v1/students/"+s1id+"/scores", parent2)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("parent2 expected 403 got %d", rec.Code)
	}

	// unauth 401
	rec = get(h, "/v1/students/"+s1id+"/scores", http.Header{})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("unauth expected 401 got %d", rec.Code)
	}
}
