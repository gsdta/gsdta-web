package apihttp

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

type guardian struct {
	ID     string `json:"id"`
	UserID string `json:"userId"`
	Phone  string `json:"phone"`
}

type student struct {
	ID         string `json:"id"`
	GuardianID string `json:"guardianId"`
	FirstName  string `json:"firstName"`
	LastName   string `json:"lastName"`
}

type listG struct {
	Items []guardian `json:"items"`
	Total int        `json:"total"`
}

type listS struct {
	Items []student `json:"items"`
	Total int       `json:"total"`
}

func do(ts http.Handler, method, path string, hdr http.Header, body any) *httptest.ResponseRecorder {
	var buf *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewReader(b)
	} else {
		buf = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, buf)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, vs := range hdr {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	rec := httptest.NewRecorder()
	ts.ServeHTTP(rec, req)
	return rec
}

func headerUser(id, roles, email, name string) http.Header {
	h := http.Header{}
	h.Set("X-Debug-User", id+"|"+roles+"|"+email+"|"+name)
	return h
}

func TestGuardians_ParentOwnership(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	p1 := headerUser("parent1", "parent", "p1@example.com", "P1")

	// Parent1 creates own guardian (userId set automatically)
	rec := do(h, http.MethodPost, "/v1/guardians", p1, map[string]any{"phone": "+1-555"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("p1 create guardian expected 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var g1 guardian
	_ = json.Unmarshal(rec.Body.Bytes(), &g1)
	if g1.UserID != "parent1" {
		t.Fatalf("guardian userId should be parent1, got %s", g1.UserID)
	}

	// Admin creates guardian for parent2
	rec = do(h, http.MethodPost, "/v1/guardians", admin, map[string]any{"userId": "parent2", "phone": "+1-777"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("admin create guardian expected 201 got %d", rec.Code)
	}
	var g2 guardian
	_ = json.Unmarshal(rec.Body.Bytes(), &g2)
	if g2.UserID != "parent2" {
		t.Fatalf("guardian userId should be parent2, got %s", g2.UserID)
	}

	// Parent1 list should see only their guardian
	rec = do(h, http.MethodGet, "/v1/guardians", p1, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("p1 list guardians expected 200 got %d", rec.Code)
	}
	var lg listG
	_ = json.Unmarshal(rec.Body.Bytes(), &lg)
	if lg.Total != 1 || len(lg.Items) != 1 {
		t.Fatalf("p1 expected 1 guardian got %d/%d", len(lg.Items), lg.Total)
	}
	if lg.Items[0].UserID != "parent1" {
		t.Fatalf("p1 saw wrong guardian")
	}

	// Parent1 cannot GET parent2 guardian
	rec = do(h, http.MethodGet, "/v1/guardians/"+g2.ID, p1, nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("p1 get foreign guardian expected 403 got %d", rec.Code)
	}

	// Admin sees both
	rec = do(h, http.MethodGet, "/v1/guardians", admin, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("admin list guardians expected 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &lg)
	if lg.Total != 2 {
		t.Fatalf("admin expected 2 guardians got %d", lg.Total)
	}
}

func TestStudents_ParentOwnership(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)
	admin := headerUser("admin1", "admin", "a@example.com", "Admin")
	p1 := headerUser("parent1", "parent", "p1@example.com", "P1")
	p2 := headerUser("parent2", "parent", "p2@example.com", "P2")

	// Admin creates guardians for both parents
	rec := do(h, http.MethodPost, "/v1/guardians", admin, map[string]any{"userId": "parent1", "phone": "+1"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("admin create g1 201 got %d", rec.Code)
	}
	var g1 guardian
	_ = json.Unmarshal(rec.Body.Bytes(), &g1)
	rec = do(h, http.MethodPost, "/v1/guardians", admin, map[string]any{"userId": "parent2", "phone": "+2"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("admin create g2 201 got %d", rec.Code)
	}
	var g2 guardian
	_ = json.Unmarshal(rec.Body.Bytes(), &g2)

	// Parent1 creates student under own guardian OK
	rec = do(h, http.MethodPost, "/v1/students", p1, map[string]any{"guardianId": g1.ID, "firstName": "S1", "lastName": "L"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("p1 create student expected 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var s1 student
	_ = json.Unmarshal(rec.Body.Bytes(), &s1)
	if s1.GuardianID != g1.ID {
		t.Fatalf("student guardian mismatch")
	}

	// Parent1 cannot create student for parent2 guardian
	rec = do(h, http.MethodPost, "/v1/students", p1, map[string]any{"guardianId": g2.ID, "firstName": "X", "lastName": "Y"})
	if rec.Code != http.StatusForbidden {
		t.Fatalf("p1 create student foreign guardian expected 403 got %d", rec.Code)
	}

	// List for parent1 shows 1
	rec = do(h, http.MethodGet, "/v1/students", p1, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("p1 list students expected 200 got %d", rec.Code)
	}
	var ls listS
	_ = json.Unmarshal(rec.Body.Bytes(), &ls)
	if ls.Total != 1 || len(ls.Items) != 1 {
		t.Fatalf("p1 expected 1 student got %d/%d", len(ls.Items), ls.Total)
	}

	// Admin sees 1
	rec = do(h, http.MethodGet, "/v1/students", admin, nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("admin list students expected 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &ls)
	if ls.Total != 1 {
		t.Fatalf("admin expected 1 student got %d", ls.Total)
	}

	// Parent2 cannot GET parent1's student
	rec = do(h, http.MethodGet, "/v1/students/"+s1.ID, p2, nil)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("p2 get foreign student expected 403 got %d", rec.Code)
	}
}
