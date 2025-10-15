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

type annItem struct {
	ID        string    `json:"id"`
	Scope     string    `json:"scope"`
	ClassID   string    `json:"classId"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	PublishAt time.Time `json:"publishAt"`
}

type annList struct {
	Items []annItem `json:"items"`
	Total int       `json:"total"`
}

func TestAnnouncements_Public_SchoolScope_PublishAt(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")

	now := time.Now().UTC()

	// Create school-scoped announcements: one past (visible), one future (not visible)
	rec := post(h, "/v1/admin/announcements", admin, map[string]any{"scope": "school", "title": "Welcome", "body": "Hello", "publishAt": now.Add(-time.Hour)})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create ann past 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	rec = post(h, "/v1/admin/announcements", admin, map[string]any{"scope": "school", "title": "Future", "body": "Soon", "publishAt": now.Add(time.Hour)})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create ann future 201 got %d", rec.Code)
	}
	// Class-scoped should not appear in public school feed
	rec = post(h, "/v1/admin/announcements", admin, map[string]any{"scope": "class", "classId": "c1", "title": "Class", "body": "Private", "publishAt": now.Add(-time.Hour)})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create class ann 201 got %d", rec.Code)
	}

	// Public query (no auth) for school scope
	rec = get(h, "/v1/announcements?scope=school", http.Header{})
	if rec.Code != http.StatusOK {
		t.Fatalf("public list 200 got %d", rec.Code)
	}
	var list annList
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if list.Total != 1 || len(list.Items) != 1 {
		t.Fatalf("expected 1 visible school announcement got %d/%d", len(list.Items), list.Total)
	}
	if list.Items[0].Title != "Welcome" {
		t.Fatalf("expected 'Welcome' got %s", list.Items[0].Title)
	}
}

func TestAnnouncements_ClassScoped_Visibility_ByRoleAndEnrollment(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	teacher1 := headerUser("teacher1", "teacher", "t1@example.com", "T1")
	teacher2 := headerUser("teacher2", "teacher", "t2@example.com", "T2")
	parent1 := headerUser("parent1", "parent", "p1@example.com", "P1")
	parent2 := headerUser("parent2", "parent", "p2@example.com", "P2")

	// Setup a class with teacher1
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
		t.Fatalf("room got %d body=%s", rec.Code, rec.Body.String())
	}
	var room map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &room)
	rec = post(h, "/v1/classes", admin, map[string]any{"termId": term["id"].(string), "campusId": campus["id"].(string), "roomId": room["id"].(string), "teacherId": "teacher1", "level": "L1", "weekday": 3, "startHHMM": "10:00", "endHHMM": "11:00", "capacity": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("class got %d body=%s", rec.Code, rec.Body.String())
	}
	var cls map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls)
	classID := cls["id"].(string)

	now := time.Now().UTC()
	// Create class-scoped announcements: one past (visible), one future (not visible)
	rec = post(h, "/v1/admin/announcements", admin, map[string]any{"scope": "class", "classId": classID, "title": "A1", "body": "B1", "publishAt": now.Add(-time.Hour)})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create class ann past got %d", rec.Code)
	}
	rec = post(h, "/v1/admin/announcements", admin, map[string]any{"scope": "class", "classId": classID, "title": "A2 Future", "body": "B2", "publishAt": now.Add(time.Hour)})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create class ann future got %d", rec.Code)
	}

	// Create guardian, student and enroll in class
	rec = post(h, "/v1/guardians", admin, map[string]any{"userId": "parent1", "phone": "+1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("guardian got %d", rec.Code)
	}
	var g map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &g)
	gid := g["id"].(string)
	rec = post(h, "/v1/students", admin, map[string]any{"guardianId": gid, "firstName": "S1", "lastName": "L"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("student got %d body=%s", rec.Code, rec.Body.String())
	}
	var s map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &s)
	sid := s["id"].(string)
	rec = post(h, "/v1/enrollments:apply", http.Header{}, map[string]any{"studentId": sid, "classId": classID})
	if rec.Code != http.StatusCreated {
		t.Fatalf("enroll apply got %d", rec.Code)
	}

	// Promote enrollment to 'enrolled' via store so parent path is authorized
	ens, _, _ := st.Enrollments().List(context.Background(), store.ListOptions{})
	var eid string
	for _, e := range ens {
		if e.StudentID == sid && e.ClassID == classID {
			eid = e.ID
			e.Status = "enrolled"
			if _, err := st.Enrollments().Update(context.Background(), e); err != nil {
				t.Fatalf("update enrollment: %v", err)
			}
			break
		}
	}
	if eid == "" {
		t.Fatalf("enrollment id not found")
	}

	// Admin can read class announcements (past visible, future not)
	rec = get(h, fmt.Sprintf("/v1/classes/%s/announcements", classID), admin)
	if rec.Code != http.StatusOK {
		t.Fatalf("admin class anns 200 got %d", rec.Code)
	}
	var list annList
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if list.Total != 1 || list.Items[0].Title != "A1" {
		t.Fatalf("admin expected 1 past item got %+v", list)
	}

	// Owning teacher can read
	rec = get(h, fmt.Sprintf("/v1/classes/%s/announcements", classID), teacher1)
	if rec.Code != http.StatusOK {
		t.Fatalf("teacher owner 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if list.Total != 1 || list.Items[0].Title != "A1" {
		t.Fatalf("teacher owner expected 1 past item got %+v", list)
	}

	// Non-owning teacher forbidden
	rec = get(h, fmt.Sprintf("/v1/classes/%s/announcements", classID), teacher2)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("teacher non-owner expected 403 got %d", rec.Code)
	}

	// Enrolled parent can read
	rec = get(h, fmt.Sprintf("/v1/classes/%s/announcements", classID), parent1)
	if rec.Code != http.StatusOK {
		t.Fatalf("parent enrolled 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if list.Total != 1 || list.Items[0].Title != "A1" {
		t.Fatalf("parent enrolled expected 1 past item got %+v", list)
	}

	// Non-enrolled parent forbidden
	rec = get(h, fmt.Sprintf("/v1/classes/%s/announcements", classID), parent2)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("parent non-enrolled expected 403 got %d", rec.Code)
	}
}
