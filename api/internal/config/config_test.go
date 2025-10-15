package config

import (
	"os"
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	// Clear relevant env vars
	_ = os.Unsetenv("APP_ENV")
	_ = os.Unsetenv("PORT")
	_ = os.Unsetenv("LOG_LEVEL")
	_ = os.Unsetenv("CORS_ALLOWED_ORIGINS")
	_ = os.Unsetenv("SHUTDOWN_TIMEOUT")

	cfg := Load()
	if cfg.Env != "development" {
		t.Fatalf("expected Env=development got %s", cfg.Env)
	}
	if cfg.Port != "8080" {
		t.Fatalf("expected Port=8080 got %s", cfg.Port)
	}
	if cfg.LogLevel != "info" {
		t.Fatalf("expected LogLevel=info got %s", cfg.LogLevel)
	}
	if len(cfg.CORSAllowedOrigins) == 0 || cfg.CORSAllowedOrigins[0] != "http://localhost:3000" {
		t.Fatalf("expected default CORSAllowedOrigins to include http://localhost:3000 got %#v", cfg.CORSAllowedOrigins)
	}
	if cfg.ShutdownTimeout.String() != "10s" {
		t.Fatalf("expected ShutdownTimeout=10s got %s", cfg.ShutdownTimeout)
	}
}
