package middlewares

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
)

func TestRequireRole_Unauthenticated(t *testing.T) {
	r := chi.NewRouter()
	r.Use(DebugAuth)
	r.With(RequireRole(domain.RoleAdmin)).Get("/admin", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })

	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d", rec.Code)
	}
}

func TestRequireRole_Forbidden(t *testing.T) {
	r := chi.NewRouter()
	r.Use(DebugAuth)
	r.With(RequireRole(domain.RoleAdmin)).Get("/admin", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })

	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	req.Header.Set("X-Debug-User", "uid|parent|p@example.com|Parent")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 got %d", rec.Code)
	}
}

func TestRequireRole_OK(t *testing.T) {
	r := chi.NewRouter()
	r.Use(DebugAuth)
	r.With(RequireAnyRole(domain.RoleAdmin, domain.RoleTeacher)).Get("/admin", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })

	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	req.Header.Set("X-Debug-User", "uid|teacher|t@example.com|Teacher")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204 got %d", rec.Code)
	}
}
