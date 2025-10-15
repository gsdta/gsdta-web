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

type listResp[T any] struct {
	Items []T `json:"items"`
	Total int `json:"total"`
}

func adminHeader() http.Header {
	h := http.Header{}
	h.Set("X-Debug-User", "admin1|admin|admin@example.com|Admin")
	return h
}

func postJSON(ts http.Handler, path string, hdr http.Header, body any) *httptest.ResponseRecorder {
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	for k, vs := range hdr {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	ts.ServeHTTP(rec, req)
	return rec
}

func get(ts http.Handler, path string, hdr http.Header) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for k, vs := range hdr {
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	rec := httptest.NewRecorder()
	ts.ServeHTTP(rec, req)
	return rec
}

func TestAdminCRUD_CreateAndListFilters(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)
	hdr := adminHeader()

	// Create a term
	termIn := map[string]any{"name": "T1"}
	rec := postJSON(h, "/v1/terms", hdr, termIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create term: expected 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var term map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &term)
	termID := term["id"].(string)

	// Create a campus
	rec = postJSON(h, "/v1/campuses", hdr, map[string]any{"name": "Main"})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create campus: expected 201 got %d", rec.Code)
	}
	var campus map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &campus)
	campusID := campus["id"].(string)

	// Create a room
	rec = postJSON(h, "/v1/rooms", hdr, map[string]any{"campusId": campusID, "name": "R1", "capacity": 10})
	if rec.Code != http.StatusCreated {
		t.Fatalf("create room: expected 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var room map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &room)
	roomID := room["id"].(string)

	// Create a class
	classIn := map[string]any{"termId": termID, "campusId": campusID, "roomId": roomID, "level": "L1", "weekday": 2, "startHHMM": "15:30", "endHHMM": "16:30", "capacity": 10}
	rec = postJSON(h, "/v1/classes", hdr, classIn)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create class: expected 201 got %d body=%s", rec.Code, rec.Body.String())
	}
	var cls map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &cls)
	classID := cls["id"].(string)
	if classID == "" {
		t.Fatalf("class id missing")
	}

	// List classes by term filter
	rec = get(h, fmt.Sprintf("/v1/classes?termId=%s", termID), hdr)
	if rec.Code != http.StatusOK {
		t.Fatalf("list by term: expected 200 got %d", rec.Code)
	}
	var list listResp[map[string]any]
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if list.Total != 1 || len(list.Items) != 1 {
		t.Fatalf("expected 1 class got %d/%d", len(list.Items), list.Total)
	}
	if list.Items[0]["termId"].(string) != termID {
		t.Fatalf("termId mismatch")
	}

	// List classes by campus filter
	rec = get(h, fmt.Sprintf("/v1/classes?campusId=%s", campusID), hdr)
	if rec.Code != http.StatusOK {
		t.Fatalf("list by campus: expected 200 got %d", rec.Code)
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &list)
	if list.Total != 1 || len(list.Items) != 1 {
		t.Fatalf("expected 1 class got %d/%d", len(list.Items), list.Total)
	}
	if list.Items[0]["campusId"].(string) != campusID {
		t.Fatalf("campusId mismatch")
	}
}

func TestAdminRooms_Validation(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)
	hdr := adminHeader()

	// capacity must be > 0
	rec := postJSON(h, "/v1/rooms", hdr, map[string]any{"campusId": "c1", "name": "R1", "capacity": 0})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", rec.Code)
	}
}
