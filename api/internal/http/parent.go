package apihttp

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

func mountGuardians(r chi.Router, st store.Accessor) {
	r.Use(middlewares.RequireAuth)

	// List
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		p, _ := middlewares.FromContext(req.Context())
		items, _, _ := st.Guardians().List(req.Context(), parseListOptions(req))
		// Admin sees all, parent sees only own guardian(s)
		if hasRole(p, domain.RoleAdmin) {
			writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
			return
		}
		filtered := filterGuardiansByUser(items, p.ID)
		writeJSON(w, http.StatusOK, map[string]any{"items": filtered, "total": len(filtered)})
	})

	// Create
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		p, _ := middlewares.FromContext(req.Context())
		var in domain.Guardian
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if !hasRole(p, domain.RoleAdmin) {
			// force ownership
			in.UserID = p.ID
		} else {
			// admin: if no userId provided, reject
			if strings.TrimSpace(in.UserID) == "" {
				http.Error(w, "userId required", http.StatusBadRequest)
				return
			}
		}
		out, err := st.Guardians().Create(req.Context(), in)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			g, err := st.Guardians().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			p, _ := middlewares.FromContext(req.Context())
			if !hasRole(p, domain.RoleAdmin) && g.UserID != p.ID {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
			writeJSON(w, http.StatusOK, g)
		})
		r.Put("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			g, err := st.Guardians().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			p, _ := middlewares.FromContext(req.Context())
			if !hasRole(p, domain.RoleAdmin) && g.UserID != p.ID {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
			var in domain.Guardian
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			in.ID = id
			// preserve ownership for parent
			if !hasRole(p, domain.RoleAdmin) {
				in.UserID = p.ID
			}
			out, err := st.Guardians().Update(req.Context(), in)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		// Delete: admin only
		r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
			p, _ := middlewares.FromContext(req.Context())
			if !hasRole(p, domain.RoleAdmin) {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
			id := chi.URLParam(req, "id")
			if err := st.Guardians().Delete(req.Context(), id); err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		})
	})
}

func mountStudents(r chi.Router, st store.Accessor) {
	r.Use(middlewares.RequireAuth)

	// List
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		p, _ := middlewares.FromContext(req.Context())
		items, _, _ := st.Students().List(req.Context(), parseListOptions(req))
		if hasRole(p, domain.RoleAdmin) {
			writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": len(items)})
			return
		}
		// filter by guardian ownership
		owners := userGuardianIDs(req, st, p.ID)
		filtered := make([]domain.Student, 0)
		for _, s := range items {
			if contains(owners, s.GuardianID) {
				filtered = append(filtered, s)
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": filtered, "total": len(filtered)})
	})

	// Create
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		p, _ := middlewares.FromContext(req.Context())
		var in domain.Student
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(in.FirstName) == "" || strings.TrimSpace(in.LastName) == "" {
			http.Error(w, "firstName and lastName required", http.StatusBadRequest)
			return
		}
		if !hasRole(p, domain.RoleAdmin) {
			// ensure guardian belongs to user
			owners := userGuardianIDs(req, st, p.ID)
			if !contains(owners, in.GuardianID) {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
		}
		out, err := st.Students().Create(req.Context(), in)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			s, err := st.Students().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			p, _ := middlewares.FromContext(req.Context())
			if !hasRole(p, domain.RoleAdmin) {
				owners := userGuardianIDs(req, st, p.ID)
				if !contains(owners, s.GuardianID) {
					http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
					return
				}
			}
			writeJSON(w, http.StatusOK, s)
		})
		r.Put("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			s, err := st.Students().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			p, _ := middlewares.FromContext(req.Context())
			if !hasRole(p, domain.RoleAdmin) {
				owners := userGuardianIDs(req, st, p.ID)
				if !contains(owners, s.GuardianID) {
					http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
					return
				}
			}
			var in domain.Student
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			in.ID = id
			out, err := st.Students().Update(req.Context(), in)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			s, err := st.Students().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			p, _ := middlewares.FromContext(req.Context())
			if !hasRole(p, domain.RoleAdmin) {
				owners := userGuardianIDs(req, st, p.ID)
				if !contains(owners, s.GuardianID) {
					http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
					return
				}
			}
			if err := st.Students().Delete(req.Context(), id); err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		})
	})
}

func hasRole(p *middlewares.Principal, role domain.Role) bool {
	if p == nil {
		return false
	}
	for _, r := range p.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func filterGuardiansByUser(gs []domain.Guardian, userID string) []domain.Guardian {
	out := make([]domain.Guardian, 0)
	for _, g := range gs {
		if g.UserID == userID {
			out = append(out, g)
		}
	}
	return out
}

func userGuardianIDs(req *http.Request, st store.Accessor, userID string) []string {
	gs, _, _ := st.Guardians().List(req.Context(), store.ListOptions{})
	ids := make([]string, 0)
	for _, g := range gs {
		if g.UserID == userID {
			ids = append(ids, g.ID)
		}
	}
	return ids
}

func contains(arr []string, id string) bool {
	for _, v := range arr {
		if v == id {
			return true
		}
	}
	return false
}
