package apihttp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

type enroll struct {
	ID        string `json:"id"`
	StudentID string `json:"studentId"`
	ClassID   string `json:"classId"`
	Status    string `json:"status"`
}

type dropOut struct {
	Dropped  enroll  `json:"dropped"`
	Promoted *enroll `json:"promoted"`
}

func adminHdr() http.Header { return headerUser("admin1", "admin", "a@example.com", "Admin") }

func post(ts http.Handler, path string, hdr http.Header, body any) *httptest.ResponseRecorder {
	var buf *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewReader(b)
	} else {
		buf = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(http.MethodPost, path, buf)
	for k, vs := range hdr {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	ts.ServeHTTP(rec, req)
	return rec
}

func TestEnrollment_Apply_Waitlist_Promotion(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)
	admin := adminHdr()

	// Create term/campus/room/class with capacity=1
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
	classIn := map[string]any{"termId": termID, "campusId": campusID, "roomId": roomID, "level": "L1", "weekday": 2, "startHHMM": "15:30", "endHHMM": "16:30", "capacity": 1}
	rec = post(h, "/v1/classes", admin, classIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("class 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var cls map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls)
	classID := cls["id"].(string)

	// Create a guardian and two students under that guardian (admin)
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

	// Apply for both students: first enrolled, second waitlisted
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s1 expected 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var e1 enroll
	_ = json.Unmarshal(rec.Body.Bytes(), &e1)
	if e1.Status != "enrolled" {
		t.Fatalf("s1 should be enrolled got %s", e1.Status)
	}

	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s2id, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s2 expected 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var e2 enroll
	_ = json.Unmarshal(rec.Body.Bytes(), &e2)
	if e2.Status != "waitlisted" {
		t.Fatalf("s2 should be waitlisted got %s", e2.Status)
	}

	// Drop first enrollment, expect promotion of e2
	rec = post(h, fmt.Sprintf("/v1/enrollments/%s:drop", e1.ID), admin, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("drop s1 expected 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var d dropOut
	_ = json.Unmarshal(rec.Body.Bytes(), &d)
	if d.Dropped.Status != "dropped" {
		t.Fatalf("dropped status mismatch")
	}
	if d.Promoted == nil || d.Promoted.ID != e2.ID || d.Promoted.Status != "enrolled" {
		t.Fatalf("expected e2 promoted to enrolled, got %#v", d.Promoted)
	}
}
