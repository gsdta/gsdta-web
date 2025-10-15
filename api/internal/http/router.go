package apihttp

import (
	"encoding/json"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rs/zerolog"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
	"github.com/gsdta/api/internal/version"
)

// NewRouter wires the HTTP routes and middleware.
func NewRouter(cfg config.Config, logger zerolog.Logger, st store.Accessor) http.Handler {
	r := chi.NewRouter()

	// Standard middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	// Basic rate limit: generous defaults to avoid impacting tests
	r.Use(RateLimit(1000, time.Minute))
	// Limit request bodies to 1MB
	r.Use(LimitBody(1 << 20))
	// Convert plain error bodies to RFC7807 problem+json
	r.Use(ProblemMiddleware)
	// Add ETag support for GETs
	r.Use(ETagMiddleware)
	// Recovery and logging
	r.Use(recoverer(logger))
	r.Use(logging(logger))

	// CORS
	c := cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Debug-User"},
		ExposedHeaders:   []string{"Link", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	r.Use(c)

	// Stub auth (dev): parse X-Debug-User and attach principal
	r.Use(middlewares.DebugAuth)
	// Per-role rate limits (highest role limit applied). Window 1 minute.
	r.Use(RoleRateLimit(map[domain.Role]int{
		domain.RoleAdmin:   1000,
		domain.RoleTeacher: 600,
		domain.RoleParent:  400,
	}, 200, time.Minute))

	// Health and version
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Top-level redirects for docs and OpenAPI JSON
	r.Get("/docs", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/v1/docs", http.StatusTemporaryRedirect)
	})
	r.Get("/openapi.json", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/v1/openapi.json", http.StatusTemporaryRedirect)
	})

	r.Route("/v1", func(r chi.Router) {
		r.Get("/version", func(w http.ResponseWriter, _ *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(version.Info())
		})

		// OpenAPI minimal spec
		mountOpenAPI(r)

		// Auth: return current principal (requires auth)
		r.With(middlewares.RequireAuth).Get("/auth/me", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			if p, ok := middlewares.FromContext(r.Context()); ok && p != nil {
				_ = json.NewEncoder(w).Encode(p)
				return
			}
			writeProblem(w, r, http.StatusUnauthorized, http.StatusText(http.StatusUnauthorized), "missing auth", "about:blank", nil)
		})

		// Admin CRUD routes
		r.Route("/terms", func(r chi.Router) { mountTerms(r, st) })
		r.Route("/campuses", func(r chi.Router) { mountCampuses(r, st) })
		r.Route("/rooms", func(r chi.Router) { mountRooms(r, st) })
		r.Route("/classes", func(r chi.Router) { mountClasses(r, st) })
		r.Route("/events", func(r chi.Router) { mountEvents(r, st) })

		// Parent & Students
		r.Route("/guardians", func(r chi.Router) { mountGuardians(r, st) })
		r.Route("/students", func(r chi.Router) { mountStudents(r, st) })

		// Enrollments workflow
		mountEnrollments(r, st)

		// Calendars
		mountCalendar(r, st)

		// Attendance (teacher)
		mountAttendance(r, st)

		// Assessments & Scores
		mountAssessments(r, st)

		// Events & Registrations
		mountEventRegistrations(r, st)

		// Announcements
		mountAnnouncements(r, st)

		// Reports (admin)
		mountReports(r, st)

		// Exports (admin, CSV)
		mountExports(r, st, cfg)
	})

	return r
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.status = code
	sr.ResponseWriter.WriteHeader(code)
}

func logging(logger zerolog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			dur := time.Since(start)

			// Extract request ID if present
			reqID := middleware.GetReqID(r.Context())
			logger.Info().
				Str("req_id", reqID).
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", rec.status).
				Dur("duration", dur).
				Msg("http_request")
		})
	}
}

func recoverer(logger zerolog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					logger.Error().
						Interface("panic", rec).
						Bytes("stack", debug.Stack()).
						Msg("panic_recovered")
					writeProblem(w, r, http.StatusInternalServerError, http.StatusText(http.StatusInternalServerError), "unexpected server error", "about:blank", nil)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
