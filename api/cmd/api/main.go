package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	nethttp "net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/gsdta/api/internal/config"
	apihttp "github.com/gsdta/api/internal/http"
	"github.com/gsdta/api/internal/store"
	"github.com/gsdta/api/internal/store/memory"
	pgstore "github.com/gsdta/api/internal/store/postgres"
	"github.com/gsdta/api/internal/version"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	// Configure global logger
	level, err := zerolog.ParseLevel(cfg.LogLevel)
	if err != nil {
		level = zerolog.InfoLevel
	}
	zerolog.TimeFieldFormat = time.RFC3339
	log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger().Level(level)

	// Echo startup info
	log.Info().
		Str("port", cfg.Port).
		Strs("cors_allowed_origins", cfg.CORSAllowedOrigins).
		Str("log_level", level.String()).
		Bool("seed_on_start", cfg.SeedOnStart).
		Str("database_url_set", fmt.Sprintf("%t", cfg.DatabaseURL != "")).
		Bool("migrate_on_start", cfg.MigrateOnStart).
		Interface("version", version.Info()).
		Msg("starting api server")

	// Choose store
	var st store.Accessor
	if cfg.DatabaseURL != "" {
		db, err := sql.Open("postgres", cfg.DatabaseURL)
		if err != nil {
			log.Fatal().Err(err).Msg("open postgres")
		}
		db.SetMaxOpenConns(10)
		db.SetMaxIdleConns(5)
		db.SetConnMaxLifetime(30 * time.Minute)
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := db.PingContext(ctx); err != nil {
			cancel()
			log.Fatal().Err(err).Msg("ping postgres")
		}
		cancel()
		pg := pgstore.New(db)
		if cfg.MigrateOnStart {
			// Attempt to load and apply schema from local file path
			if b, err := os.ReadFile("gsdta.sql"); err == nil {
				if err := pg.Migrate(context.Background(), string(b)); err != nil {
					log.Warn().Err(err).Msg("schema migrate failed")
				} else {
					log.Info().Msg("schema migrated")
				}
			}
		}
		st = pg
		log.Info().Msg("using postgres store")
	} else {
		mem := memory.New()
		if cfg.SeedOnStart {
			if res, err := memory.SeedDev(mem); err != nil {
				log.Warn().Err(err).Msg("seed dev failed")
			} else {
				log.Info().Str("term_id", res.TermID).Str("class_id", res.ClassID).Str("student_id", res.StudentID).Msg("seed dev completed")
			}
		}
		st = mem
		log.Info().Msg("using in-memory store")
	}

	r := apihttp.NewRouter(cfg, log.Logger, st)

	srv := &nethttp.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	errCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("http server listening")
		errCh <- srv.ListenAndServe()
	}()

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-errCh:
		if err != nil && !errors.Is(err, nethttp.ErrServerClosed) && !strings.Contains(err.Error(), "Server closed") {
			log.Error().Err(err).Msg("server error")
		}
	case sig := <-sigCh:
		log.Info().Str("signal", sig.String()).Msg("shutdown signal received")
	}

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("graceful shutdown failed")
	}
	log.Info().Msg("server stopped")
}
