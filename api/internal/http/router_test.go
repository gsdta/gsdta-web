package apihttp

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/store/memory"
)

type versionResp struct {
	Version   string `json:"version"`
	Commit    string `json:"commit"`
	BuildTime string `json:"buildTime"`
	GoVersion string `json:"goVersion"`
}

func TestHealthz(t *testing.T) {
	cfg := config.Load()
	logger := zerolog.Nop()
	st := memory.New()
	h := NewRouter(cfg, logger, st)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200 got %d", rec.Code)
	}
	if rec.Body.String() != "ok" {
		t.Fatalf("expected body 'ok' got %q", rec.Body.String())
	}
}

func TestVersion(t *testing.T) {
	cfg := config.Load()
	logger := log.Logger
	st := memory.New()
	h := NewRouter(cfg, logger, st)

	req := httptest.NewRequest(http.MethodGet, "/v1/version", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200 got %d", rec.Code)
	}

	var vr versionResp
	if err := json.Unmarshal(rec.Body.Bytes(), &vr); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if vr.GoVersion == "" {
		t.Fatalf("expected goVersion to be set")
	}
}
