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

type studentScoreItem struct {
	ID           string    `json:"id"`
	AssessmentID string    `json:"assessmentId"`
	Title        string    `json:"title"`
	Date         time.Time `json:"date"`
	MaxScore     int       `json:"maxScore"`
	Value        float64   `json:"value"`
}

type studentScoresList struct {
	Items []studentScoreItem `json:"items"`
}

func TestAssessments_Create_BulkScore_ParentRead(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	teacher := headerUser("teacher1", "teacher", "t@example.com", "Teacher")
	otherTeacher := headerUser("teacher2", "teacher", "t2@example.com", "Teacher 2")
	parent := headerUser("parent1", "parent", "p@example.com", "Parent")

	// Setup: term, campus, room, class with teacher1
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
		t.Fatalf("room 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var room map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &room)
	roomID := room["id"].(string)
	classIn := map[string]any{"termId": termID, "campusId": campusID, "roomId": roomID, "teacherId": "teacher1", "level": "L1", "weekday": 3, "startHHMM": "10:00", "endHHMM": "11:00", "capacity": 10}
	rec = post(h, "/v1/classes", admin, classIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("class 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var cls map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls)
	classID := cls["id"].(string)

	// Guardian and two students; enroll both
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

	// Also create a non-enrolled student
	rec = post(h, "/v1/students", admin, map[string]any{"guardianId": gid, "firstName": "S3", "lastName": "L"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("s3 201 got %d", rec.Code)
	}
	var s3 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &s3)
	s3id := s3["id"].(string)

	// Enroll S1 and S2
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s1 201 got %d", rec.Code)
	}
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s2id, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s2 201 got %d", rec.Code)
	}

	// Create assessment by teacher1
	aIn := map[string]any{"classId": classID, "title": "Quiz 1", "date": time.Now().UTC(), "level": "L1", "maxScore": 10}
	rec = post(h, "/v1/assessments", teacher, aIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("assessment 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var a map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &a)
	aID := a["id"].(string)

	// Bulk enter scores by owning teacher
	rec = post(h, "/v1/assessments/"+aID+"/scores", teacher, []map[string]any{{"studentId": s1id, "value": 8}, {"studentId": s2id, "value": 9.5}})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("bulk scores expected 204 got %d body=%s", rec.Code, rec.Body.String())
	}

	// Parent reads S1 scores
	rec = get(h, "/v1/students/"+s1id+"/scores", parent)
	if rec.Code != http.StatusOK {
		t.Fatalf("parent read scores 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var list studentScoresList
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if len(list.Items) != 1 {
		t.Fatalf("expected 1 score got %d", len(list.Items))
	}
	if list.Items[0].Title != "Quiz 1" || list.Items[0].MaxScore != 10 || list.Items[0].Value != 8 {
		t.Fatalf("unexpected score payload: %+v", list.Items[0])
	}

	// Out-of-range value rejected
	rec = post(h, "/v1/assessments/"+aID+"/scores", teacher, []map[string]any{{"studentId": s1id, "value": 11}})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 out-of-range got %d", rec.Code)
	}

	// Non-enrolled student rejected
	rec = post(h, "/v1/assessments/"+aID+"/scores", teacher, []map[string]any{{"studentId": s3id, "value": 5}})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 non-enrolled got %d", rec.Code)
	}

	// Other teacher cannot score (forbidden)
	rec = post(h, "/v1/assessments/"+aID+"/scores", otherTeacher, []map[string]any{{"studentId": s1id, "value": 7}})
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-owning teacher got %d", rec.Code)
	}

	// Update existing score (idempotent upsert)
	rec = post(h, "/v1/assessments/"+aID+"/scores", teacher, []map[string]any{{"studentId": s1id, "value": 9}})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("update 204 got %d", rec.Code)
	}
	rec = get(h, "/v1/students/"+s1id+"/scores", parent)
	if rec.Code != http.StatusOK {
		t.Fatalf("parent read scores 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if len(list.Items) != 1 || list.Items[0].Value != 9 {
		t.Fatalf("expected updated value=9 got %+v", list.Items)
	}
}
