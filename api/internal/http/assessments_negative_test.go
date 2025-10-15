package apihttp

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

func TestAssessments_Create_Negative(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	teacher1 := headerUser("teacher1", "teacher", "t1@example.com", "T1")
	teacher2 := headerUser("teacher2", "teacher", "t2@example.com", "T2")

	// Setup class owned by teacher1
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
	rec = post(h, "/v1/classes", admin, map[string]any{"termId": term["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "teacherId": "teacher1", "level": "L1", "weekday": 2, "startHHMM": "10:00", "endHHMM": "11:00", "capacity": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("class got %d", rec.Code)
	}
	var cls map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls)
	classID := cls["id"].(string)

	// Non-owning teacher cannot create assessment
	rec = post(h, "/v1/assessments", teacher2, map[string]any{"classId": classID, "title": "Quiz", "maxScore": 10})
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 non-owner got %d", rec.Code)
	}

	// Missing title -> 400
	rec = post(h, "/v1/assessments", teacher1, map[string]any{"classId": classID, "title": "", "maxScore": 10})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 missing title got %d", rec.Code)
	}

	// maxScore <= 0 -> 400
	rec = post(h, "/v1/assessments", teacher1, map[string]any{"classId": classID, "title": "Q1", "maxScore": 0})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 maxScore got %d", rec.Code)
	}
}
