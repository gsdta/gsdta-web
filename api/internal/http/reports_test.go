package apihttp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store"
	"github.com/gsdta/api/internal/store/memory"
)

type enrollReportResp struct {
	Items []struct {
		ClassID, Level string
		Count          int
	} `json:"items"`
}

type attendanceReportResp struct {
	Items []struct {
		ClassID, StudentID string
		Present, Total     int
	} `json:"items"`
}

type scoreReportResp struct {
	Items []struct {
		StudentID string
		Count     int
		Avg       float64
	} `json:"items"`
}

type regReportResp struct {
	Items []struct{ EventID, StudentID, Status string } `json:"items"`
}

func TestReports_Admin_Aggregates(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	teacher := headerUser("teacher1", "teacher", "t@example.com", "Teacher")
	parent := headerUser("parent1", "parent", "p@example.com", "Parent")

	// Seed: term, campus, room, class (L1)
	rec := post(h, "/v1/terms", admin, map[string]any{"name": "T1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("term 201 got %d", rec.Code)
	}
	var term1 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &term1)
	rec = post(h, "/v1/campuses", admin, map[string]any{"name": "Main"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("campus 201 got %d", rec.Code)
	}
	var campus map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &campus)
	rec = post(h, "/v1/rooms", admin, map[string]any{"campusId": campus["id"].(string), "name": "R1", "capacity": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("room 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var room map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &room)
	classIn := map[string]any{"termId": term1["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "teacherId": "teacher1", "level": "L1", "weekday": 3, "startHHMM": "10:00", "endHHMM": "11:00", "capacity": 10}
	rec = post(h, "/v1/classes", admin, classIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("class 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var cls1 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls1)
	classID1 := cls1["id"].(string)

	// Second term/class for scores term filter
	rec = post(h, "/v1/terms", admin, map[string]any{"name": "T2"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("term2 201 got %d", rec.Code)
	}
	var term2 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &term2)
	rec = post(h, "/v1/classes", admin, map[string]any{"termId": term2["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "teacherId": "teacher1", "level": "L2", "weekday": 4, "startHHMM": "12:00", "endHHMM": "13:00", "capacity": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("class2 201 got %d", rec.Code)
	}
	var cls2 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls2)
	classID2 := cls2["id"].(string)

	// Guardian and two students
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

	// Enroll both in class1 and set status=enrolled
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID1})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s1 201 got %d", rec.Code)
	}
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s2id, "classId": classID1})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s2 201 got %d", rec.Code)
	}
	ens, _, _ := st.Enrollments().List(context.Background(), store.ListOptions{})
	for _, e := range ens {
		if e.ClassID == classID1 && (e.StudentID == s1id || e.StudentID == s2id) {
			e.Status = "enrolled"
			if _, err := st.Enrollments().Update(context.Background(), e); err != nil {
				t.Fatalf("enrollment update: %v", err)
			}
		}
	}

	// Also enroll S1 in class2 for term2 scores
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID2})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s1->class2 201 got %d", rec.Code)
	}
	ens, _, _ = st.Enrollments().List(context.Background(), store.ListOptions{})
	for _, e := range ens {
		if e.ClassID == classID2 && e.StudentID == s1id {
			e.Status = "enrolled"
			if _, err := st.Enrollments().Update(context.Background(), e); err != nil {
				t.Fatalf("enrollment update 2: %v", err)
			}
		}
	}

	// Attendance via HTTP: two dates; s1 present twice; s2 present then absent
	date1 := time.Now().UTC().Format("2006-01-02")
	date2 := time.Now().UTC().Add(24 * time.Hour).Format("2006-01-02")
	rec = post(h, fmt.Sprintf("/v1/classes/%s/attendance/%s", classID1, date1), teacher, map[string]any{"records": []map[string]any{{"studentId": s1id, "status": "present"}, {"studentId": s2id, "status": "present"}}})
	if rec.Code != http.StatusOK {
		t.Fatalf("attendance d1 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	rec = post(h, fmt.Sprintf("/v1/classes/%s/attendance/%s", classID1, date2), teacher, map[string]any{"records": []map[string]any{{"studentId": s1id, "status": "present"}, {"studentId": s2id, "status": "absent"}}})
	if rec.Code != http.StatusOK {
		t.Fatalf("attendance d2 200 got %d body=%s", rec.Code, rec.Body.String())
	}

	// Assessments and scores
	rec = post(h, "/v1/assessments", teacher, map[string]any{"classId": classID1, "title": "Quiz1", "date": time.Now().UTC(), "level": "L1", "maxScore": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("assessment1 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var a1 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &a1)
	a1id := a1["id"].(string)
	rec = post(h, fmt.Sprintf("/v1/assessments/%s/scores", a1id), teacher, []map[string]any{{"studentId": s1id, "value": 8}, {"studentId": s2id, "value": 6}})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("scores1 204 got %d body=%s", rec.Code, rec.Body.String())
	}

	rec = post(h, "/v1/assessments", teacher, map[string]any{"classId": classID2, "title": "Quiz2", "date": time.Now().UTC(), "level": "L2", "maxScore": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("assessment2 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var a2 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &a2)
	a2id := a2["id"].(string)
	rec = post(h, fmt.Sprintf("/v1/assessments/%s/scores", a2id), teacher, []map[string]any{{"studentId": s1id, "value": 7}})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("scores2 204 got %d body=%s", rec.Code, rec.Body.String())
	}

	// Event and registrations
	rec = post(h, "/v1/events", admin, map[string]any{"title": "Recital", "start": time.Now().UTC(), "end": time.Now().UTC().Add(time.Hour), "location": "Hall", "capacity": 1})
	if rec.Code != http.StatusCreated {
		t.Fatalf("event 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var ev map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &ev)
	eid := ev["id"].(string)
	rec = post(h, fmt.Sprintf("/v1/events/%s/registrations", eid), parent, map[string]any{"studentId": s1id})
	if rec.Code != http.StatusCreated {
		t.Fatalf("reg1 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	rec = post(h, fmt.Sprintf("/v1/events/%s/registrations", eid), parent, map[string]any{"studentId": s2id})
	if rec.Code != http.StatusCreated {
		t.Fatalf("reg2 201 got %d body=%s", rec.Code, rec.Body.String())
	}

	// Reports: enrollments
	rec = get(h, "/v1/reports/enrollments", admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("reports enrollments 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var enr enrollReportResp
	_ = json.Unmarshal(rec.Body.Bytes(), &enr)
	var seenClass1 bool
	for _, it := range enr.Items {
		if it.ClassID == classID1 {
			if it.Count != 2 || it.Level != "L1" {
				t.Fatalf("expected class1 count=2 level=L1 got %+v", it)
			}
			seenClass1 = true
		}
	}
	if !seenClass1 {
		t.Fatalf("class1 not found in enrollments report: %+v", enr.Items)
	}

	// Reports: attendance
	rec = get(h, "/v1/reports/attendance", admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("reports attendance 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var at attendanceReportResp
	_ = json.Unmarshal(rec.Body.Bytes(), &at)
	var s1rate, s2rate *struct {
		ClassID, StudentID string
		Present, Total     int
	}
	for _, it := range at.Items {
		if it.ClassID == classID1 && it.StudentID == s1id {
			tmp := it
			s1rate = &tmp
		}
		if it.ClassID == classID1 && it.StudentID == s2id {
			tmp := it
			s2rate = &tmp
		}
	}
	if s1rate == nil || s2rate == nil {
		t.Fatalf("missing attendance entries: %+v", at.Items)
	}
	if s1rate.Present != 2 || s1rate.Total != 2 {
		t.Fatalf("s1 expected 2/2 got %+v", s1rate)
	}
	if s2rate.Present != 1 || s2rate.Total != 2 {
		t.Fatalf("s2 expected 1/2 got %+v", s2rate)
	}

	// Reports: scores filter by term
	rec = get(h, fmt.Sprintf("/v1/reports/scores?termId=%s", term1["id"].(string)), admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("reports scores term1 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var sr1 scoreReportResp
	_ = json.Unmarshal(rec.Body.Bytes(), &sr1)
	// Expect s1 avg 8, s2 avg 6
	var s1ok, s2ok bool
	for _, it := range sr1.Items {
		if it.StudentID == s1id {
			if it.Count != 1 || it.Avg != 8 {
				t.Fatalf("s1 term1 expected 1/8 got %+v", it)
			}
			s1ok = true
		}
		if it.StudentID == s2id {
			if it.Count != 1 || it.Avg != 6 {
				t.Fatalf("s2 term1 expected 1/6 got %+v", it)
			}
			s2ok = true
		}
	}
	if !s1ok || !s2ok {
		t.Fatalf("missing students in scores term1: %+v", sr1.Items)
	}

	rec = get(h, fmt.Sprintf("/v1/reports/scores?termId=%s", term2["id"].(string)), admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("reports scores term2 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var sr2 scoreReportResp
	_ = json.Unmarshal(rec.Body.Bytes(), &sr2)
	// Expect only s1 with avg 7
	if len(sr2.Items) != 1 || sr2.Items[0].StudentID != s1id || sr2.Items[0].Count != 1 || sr2.Items[0].Avg != 7 {
		t.Fatalf("scores term2 expected s1 1/7 got %+v", sr2.Items)
	}

	// Reports: event registrations
	rec = get(h, "/v1/reports/eventRegistrations", admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("reports regs 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var rr regReportResp
	_ = json.Unmarshal(rec.Body.Bytes(), &rr)
	if len(rr.Items) != 2 {
		t.Fatalf("expected 2 registrations got %d", len(rr.Items))
	}
}
