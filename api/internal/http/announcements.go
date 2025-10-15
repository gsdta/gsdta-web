package apihttp

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

type announcementOut struct {
	ID        string    `json:"id"`
	Scope     string    `json:"scope"`
	ClassID   string    `json:"classId,omitempty"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	PublishAt time.Time `json:"publishAt"`
}

type listAnnouncements struct {
	Items []announcementOut `json:"items"`
	Total int               `json:"total"`
}

func mountAnnouncements(r chi.Router, st store.Accessor) {
	// Public read for school scope only (no PII), publishAt respected
	r.Get("/announcements", func(w http.ResponseWriter, req *http.Request) {
		scope := strings.TrimSpace(req.URL.Query().Get("scope"))
		now := time.Now().UTC()
		anns, _, _ := st.Announcements().List(req.Context(), store.ListOptions{})
		items := make([]announcementOut, 0)
		for _, a := range anns {
			if a.PublishAt.After(now) {
				continue
			}
			if scope == "school" && a.Scope == "school" {
				items = append(items, toAnnOut(a))
			}
		}
		writeJSON(w, http.StatusOK, listAnnouncements{Items: items, Total: len(items)})
	})

	// Admin CRUD moved under /admin/announcements to avoid colliding with public GET path
	r.With(middlewares.RequireRole(domain.RoleAdmin)).Route("/admin/announcements", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			anns, _, _ := st.Announcements().List(req.Context(), parseListOptions(req))
			items := make([]announcementOut, 0, len(anns))
			for _, a := range anns {
				items = append(items, toAnnOut(a))
			}
			writeJSON(w, http.StatusOK, listAnnouncements{Items: items, Total: len(items)})
		})
		r.Post("/", func(w http.ResponseWriter, req *http.Request) {
			var in domain.Announcement
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if strings.TrimSpace(in.Scope) == "" || strings.TrimSpace(in.Title) == "" {
				http.Error(w, "scope and title required", http.StatusBadRequest)
				return
			}
			if in.Scope != "school" && in.Scope != "class" {
				http.Error(w, "invalid scope", http.StatusBadRequest)
				return
			}
			if in.Scope == "class" && strings.TrimSpace(in.ClassID) == "" {
				http.Error(w, "classId required for class scope", http.StatusBadRequest)
				return
			}
			out, err := st.Announcements().Create(req.Context(), in)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusCreated, toAnnOut(out))
		})
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", func(w http.ResponseWriter, req *http.Request) {
				id := chi.URLParam(req, "id")
				a, err := st.Announcements().Get(req.Context(), id)
				if err != nil {
					http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
					return
				}
				writeJSON(w, http.StatusOK, toAnnOut(a))
			})
			r.Put("/", func(w http.ResponseWriter, req *http.Request) {
				id := chi.URLParam(req, "id")
				var in domain.Announcement
				if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
					http.Error(w, "invalid json", http.StatusBadRequest)
					return
				}
				in.ID = id
				out, err := st.Announcements().Update(req.Context(), in)
				if err != nil {
					http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
					return
				}
				writeJSON(w, http.StatusOK, toAnnOut(out))
			})
			r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
				id := chi.URLParam(req, "id")
				if err := st.Announcements().Delete(req.Context(), id); err != nil {
					http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
					return
				}
				w.WriteHeader(http.StatusNoContent)
			})
		})
	})

	// Class-scoped read: requires role (admin/teacher owning class or parent with enrollment)
	r.With(middlewares.RequireAuth).Get("/classes/{id}/announcements", func(w http.ResponseWriter, req *http.Request) {
		classID := chi.URLParam(req, "id")
		cls, err := st.Classes().Get(req.Context(), classID)
		if err != nil {
			http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
			return
		}
		p, _ := middlewares.FromContext(req.Context())
		allowed := hasRole(p, domain.RoleAdmin)
		if !allowed && hasRole(p, domain.RoleTeacher) {
			allowed = (cls.TeacherID == p.ID)
		}
		if !allowed && hasRole(p, domain.RoleParent) {
			// parent must have an enrolled student in class
			ens, _, _ := st.Enrollments().List(req.Context(), store.ListOptions{})
			for _, e := range ens {
				if e.ClassID != classID || e.Status != domain.EnrollmentEnrolled {
					continue
				}
				stRec, err := st.Students().Get(req.Context(), e.StudentID)
				if err != nil {
					continue
				}
				owners := userGuardianIDs(req, st, p.ID)
				if contains(owners, stRec.GuardianID) {
					allowed = true
					break
				}
			}
		}
		if !allowed {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}
		now := time.Now().UTC()
		anns, _, _ := st.Announcements().List(req.Context(), store.ListOptions{})
		items := make([]announcementOut, 0)
		for _, a := range anns {
			if a.Scope == "class" && a.ClassID == classID && !a.PublishAt.After(now) {
				items = append(items, toAnnOut(a))
			}
		}
		writeJSON(w, http.StatusOK, listAnnouncements{Items: items, Total: len(items)})
	})
}

func toAnnOut(a domain.Announcement) announcementOut {
	return announcementOut{ID: a.ID, Scope: a.Scope, ClassID: a.ClassID, Title: a.Title, Body: a.Body, PublishAt: a.PublishAt}
}
