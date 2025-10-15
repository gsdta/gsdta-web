package apihttp

import (
	"net/http"
	"testing"

	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

func TestAnnouncements_Admin_Validations(t *testing.T) {
	cfg := config.Load()
	st := memory.New()
	h := NewRouter(cfg, zerolog.Nop(), st)

	admin := headerUser("admin1", "admin", "a@example.com", "Admin")

	// invalid scope
	rec := post(h, "/v1/admin/announcements", admin, map[string]any{"scope": "bad", "title": "T"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid scope expected 400 got %d", rec.Code)
	}

	// missing classId for class scope
	rec = post(h, "/v1/admin/announcements", admin, map[string]any{"scope": "class", "title": "T"})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("missing classId expected 400 got %d", rec.Code)
	}
}
