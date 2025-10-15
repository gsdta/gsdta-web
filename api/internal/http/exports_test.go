package apihttp

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store"
	"github.com/gsdta/api/internal/store/memory"
)

// readAllCSV parses a CSV response body into rows of fields.
func readAllCSV(body string) ([][]string, error) {
	r := csv.NewReader(strings.NewReader(body))
	r.FieldsPerRecord = -1
	rows := [][]string{}
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		rows = append(rows, rec)
	}
	return rows, nil
}

func TestExports_Admin_CSVEndpoints(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	teacher := headerUser("teacher1", "teacher", "t@example.com", "Teacher")
	parent := headerUser("parent1", "parent", "p@example.com", "Parent")

	// Seed: term, campus, room, class (term1, class1 L1), and class2 in term2
	rec := post(h, "/v1/terms", admin, map[string]any{"name": "T1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("term1 201 got %d", rec.Code)
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
		t.Fatalf("room 201 got %d", rec.Code)
	}
	var room map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &room)
	classIn := map[string]any{"termId": term1["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "teacherId": "teacher1", "level": "L1", "weekday": 3, "startHHMM": "10:00", "endHHMM": "11:00", "capacity": 10}
	rec = post(h, "/v1/classes", admin, classIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("class1 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var cls1 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls1)
	classID1 := cls1["id"].(string)

	rec = post(h, "/v1/terms", admin, map[string]any{"name": "T2"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("term2 201 got %d", rec.Code)
	}
	var term2 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &term2)
	class2In := map[string]any{"termId": term2["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "teacherId": "teacher1", "level": "L2", "weekday": 4, "startHHMM": "12:00", "endHHMM": "13:00", "capacity": 10}
	rec = post(h, "/v1/classes", admin, class2In)
	if rec.Code != http.StatusCreated {
		t.Fatalf("class2 201 got %d body=%s", rec.Code, rec.Body.String())
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

	// Enroll both in class1 (enrolled); also enroll s1 in class2 (enrolled)
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID1})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s1 201 got %d", rec.Code)
	}
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s2id, "classId": classID1})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s2 201 got %d", rec.Code)
	}
	// Update to enrolled
	ens, _, _ := st.Enrollments().List(context.Background(), store.ListOptions{})
	for _, e := range ens {
		if e.ClassID == classID1 && (e.StudentID == s1id || e.StudentID == s2id) {
			e.Status = "enrolled"
			_, _ = st.Enrollments().Update(context.Background(), e)
		}
	}
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": s1id, "classId": classID2})
	if rec.Code != http.StatusCreated {
		t.Fatalf("apply s1->class2 201 got %d", rec.Code)
	}
	ens, _, _ = st.Enrollments().List(context.Background(), store.ListOptions{})
	for _, e := range ens {
		if e.ClassID == classID2 && e.StudentID == s1id {
			e.Status = "enrolled"
			_, _ = st.Enrollments().Update(context.Background(), e)
		}
	}

	// Attendance: two dates for class1
	date1 := time.Now().UTC().Format("2006-01-02")
	date2 := time.Now().UTC().Add(24 * time.Hour).Format("2006-01-02")
	rec = post(h, fmt.Sprintf("/v1/classes/%s/attendance/%s", classID1, date1), teacher, map[string]any{"records": []map[string]any{{"studentId": s1id, "status": "present"}, {"studentId": s2id, "status": "present"}}})
	if rec.Code != http.StatusOK {
		t.Fatalf("attendance d1 200 got %d", rec.Code)
	}
	rec = post(h, fmt.Sprintf("/v1/classes/%s/attendance/%s", classID1, date2), teacher, map[string]any{"records": []map[string]any{{"studentId": s1id, "status": "present"}, {"studentId": s2id, "status": "absent"}}})
	if rec.Code != http.StatusOK {
		t.Fatalf("attendance d2 200 got %d", rec.Code)
	}

	// Assessments and scores
	rec = post(h, "/v1/assessments", teacher, map[string]any{"classId": classID1, "title": "Quiz1", "date": time.Now().UTC(), "level": "L1", "maxScore": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("assessment1 201 got %d", rec.Code)
	}
	var a1 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &a1)
	a1id := a1["id"].(string)
	rec = post(h, fmt.Sprintf("/v1/assessments/%s/scores", a1id), teacher, []map[string]any{{"studentId": s1id, "value": 8}, {"studentId": s2id, "value": 6}})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("scores1 204 got %d", rec.Code)
	}

	rec = post(h, "/v1/assessments", teacher, map[string]any{"classId": classID2, "title": "Quiz2", "date": time.Now().UTC(), "level": "L2", "maxScore": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("assessment2 201 got %d", rec.Code)
	}
	var a2 map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &a2)
	a2id := a2["id"].(string)
	rec = post(h, fmt.Sprintf("/v1/assessments/%s/scores", a2id), teacher, []map[string]any{{"studentId": s1id, "value": 7}})
	if rec.Code != http.StatusNoContent {
		t.Fatalf("scores2 204 got %d", rec.Code)
	}

	// Event and registrations (capacity 1 => one waitlisted)
	rec = post(h, "/v1/events", admin, map[string]any{"title": "Recital", "start": time.Now().UTC(), "end": time.Now().UTC().Add(time.Hour), "location": "Hall", "capacity": 1})
	if rec.Code != http.StatusCreated {
		t.Fatalf("event 201 got %d", rec.Code)
	}
	var ev map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &ev)
	eid := ev["id"].(string)
	rec = post(h, fmt.Sprintf("/v1/events/%s/registrations", eid), parent, map[string]any{"studentId": s1id})
	if rec.Code != http.StatusCreated {
		t.Fatalf("reg1 201 got %d", rec.Code)
	}
	rec = post(h, fmt.Sprintf("/v1/events/%s/registrations", eid), parent, map[string]any{"studentId": s2id})
	if rec.Code != http.StatusCreated {
		t.Fatalf("reg2 201 got %d", rec.Code)
	}

	// 1) Attendance export
	rec = get(h, "/v1/exports/attendance.csv", admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("attendance export 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/csv") {
		t.Fatalf("content-type expected text/csv got %s", ct)
	}
	if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "attendance.csv") {
		t.Fatalf("content-disposition missing filename, got %s", cd)
	}
	rows, err := readAllCSV(rec.Body.String())
	if err != nil {
		t.Fatalf("parse csv: %v", err)
	}
	if len(rows) < 1 || strings.Join(rows[0], ",") != "classId,date,studentId,status,at" {
		t.Fatalf("attendance header mismatch: %v", rows[0])
	}
	// Expect 4 records for class1 across two dates and two students
	var cnt int
	for _, r := range rows[1:] {
		if len(r) < 5 {
			t.Fatalf("row len < 5: %v", r)
		}
		if r[0] == classID1 && (r[2] == s1id || r[2] == s2id) && (r[1] == date1 || r[1] == date2) {
			cnt++
		}
	}
	if cnt != 4 {
		t.Fatalf("expected 4 attendance rows for class1 got %d; rows=%v", cnt, rows)
	}

	// 2) Scores export filtered by term1
	url := fmt.Sprintf("/v1/exports/scores.csv?termId=%s", term1["id"].(string))
	rec = get(h, url, admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("scores export term1 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	rows, err = readAllCSV(rec.Body.String())
	if err != nil {
		t.Fatalf("parse scores csv: %v", err)
	}
	if len(rows) < 1 || strings.Join(rows[0], ",") != "assessmentId,classId,studentId,value" {
		t.Fatalf("scores header mismatch: %v", rows[0])
	}
	// Expect two rows for s1=8 and s2=6 (order not guaranteed)
	var seenS1, seenS2 bool
	for _, r := range rows[1:] {
		if r[2] == s1id && r[3] == "8" {
			seenS1 = true
		}
		if r[2] == s2id && r[3] == "6" {
			seenS2 = true
		}
	}
	if !seenS1 || !seenS2 {
		t.Fatalf("expected scores rows for s1=8 and s2=6, got rows=%v", rows)
	}

	// 3) Event registrations export
	rec = get(h, "/v1/exports/eventRegistrations.csv", admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("event regs export 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	rows, err = readAllCSV(rec.Body.String())
	if err != nil {
		t.Fatalf("parse regs csv: %v", err)
	}
	if len(rows) < 1 || strings.Join(rows[0], ",") != "eventId,studentId,status" {
		t.Fatalf("regs header mismatch: %v", rows[0])
	}
	if len(rows)-1 != 2 {
		t.Fatalf("expected 2 registration rows got %d", len(rows)-1)
	}

	// 4) Permissions: teacher forbidden, anonymous unauthorized
	rec = get(h, "/v1/exports/attendance.csv", teacher)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("teacher should get 403, got %d", rec.Code)
	}
	rec = get(h, "/v1/exports/attendance.csv", http.Header{})
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("anon should get 401, got %d", rec.Code)
	}
}
