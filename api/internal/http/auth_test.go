package apihttp

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

type meResp struct {
	ID    string   `json:"id"`
	Email string   `json:"email"`
	Name  string   `json:"name"`
	Roles []string `json:"roles"`
}

func TestAuthMe_Unauthorized(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)
	req := httptest.NewRequest(http.MethodGet, "/v1/auth/me", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestAuthMe_Authorized_DebugHeader(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)
	req := httptest.NewRequest(http.MethodGet, "/v1/auth/me", nil)
	req.Header.Set("X-Debug-User", "id123|parent,teacher|user@example.com|Test User")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", rec.Code, rec.Body.String())
	}
	var mr meResp
	if err := json.Unmarshal(rec.Body.Bytes(), &mr); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if mr.ID != "id123" || mr.Email != "user@example.com" || mr.Name != "Test User" || len(mr.Roles) != 2 {
		t.Fatalf("unexpected me response: %#v", mr)
	}
}
