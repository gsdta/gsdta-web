package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds application configuration sourced from environment variables.
// All fields have sane defaults suitable for local development.
type Config struct {
	Env                string        // development | staging | production
	Port               string        // HTTP port
	LogLevel           string        // debug | info | warn | error
	CORSAllowedOrigins []string      // comma-separated list
	ShutdownTimeout    time.Duration // graceful shutdown timeout
	SeedOnStart        bool          // seed dev data on startup (in-memory store)
	DatabaseURL        string        // postgres connection string; if set, use Postgres store
	MigrateOnStart     bool          // run schema migration on startup (dev convenience)
}

func Load() Config {
	cfg := Config{
		Env:             getEnv("APP_ENV", "development"),
		Port:            getEnv("PORT", "8080"),
		LogLevel:        getEnv("LOG_LEVEL", "info"),
		ShutdownTimeout: getDuration("SHUTDOWN_TIMEOUT", 10*time.Second),
		DatabaseURL:     getEnv("DATABASE_URL", ""),
		MigrateOnStart:  getBool("MIGRATE_ON_START", false),
	}

	// Seed by default in development when using memory store only
	defSeed := cfg.Env == "development" && cfg.DatabaseURL == ""
	cfg.SeedOnStart = getBool("SEED_ON_START", defSeed)

	cors := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
	if cors == "*" || strings.TrimSpace(cors) == "" {
		cfg.CORSAllowedOrigins = []string{"*"}
	} else {
		parts := strings.Split(cors, ",")
		cfg.CORSAllowedOrigins = make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				cfg.CORSAllowedOrigins = append(cfg.CORSAllowedOrigins, p)
			}
		}
	}

	return cfg
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		b, err := strconv.ParseBool(v)
		if err == nil {
			return b
		}
	}
	return def
}

func getDuration(key string, def time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return def
}
