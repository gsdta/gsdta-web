package apihttp

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

func mountTerms(r chi.Router, st store.Accessor) {
	r.Use(middlewares.RequireRole(domain.RoleAdmin))
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		items, total := listTerms(req, st)
		writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var in domain.Term
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(in.Name) == "" {
			http.Error(w, "name required", http.StatusBadRequest)
			return
		}
		// unique name
		items, _, _ := st.Terms().List(req.Context(), store.ListOptions{})
		for _, t := range items {
			if strings.EqualFold(t.Name, in.Name) {
				http.Error(w, "term name exists", http.StatusConflict)
				return
			}
		}
		out, err := st.Terms().Create(req.Context(), in)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			out, err := st.Terms().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Put("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			var in domain.Term
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			in.ID = id
			if strings.TrimSpace(in.Name) == "" {
				http.Error(w, "name required", http.StatusBadRequest)
				return
			}
			out, err := st.Terms().Update(req.Context(), in)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			if err := st.Terms().Delete(req.Context(), id); err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		})
	})
}

func mountCampuses(r chi.Router, st store.Accessor) {
	r.Use(middlewares.RequireRole(domain.RoleAdmin))
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		items, total := listCampuses(req, st)
		writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var in domain.Campus
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(in.Name) == "" {
			http.Error(w, "name required", http.StatusBadRequest)
			return
		}
		// unique name
		items, _, _ := st.Campuses().List(req.Context(), store.ListOptions{})
		for _, c := range items {
			if strings.EqualFold(c.Name, in.Name) {
				http.Error(w, "campus name exists", http.StatusConflict)
				return
			}
		}
		out, err := st.Campuses().Create(req.Context(), in)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			out, err := st.Campuses().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Put("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			var in domain.Campus
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			in.ID = id
			if strings.TrimSpace(in.Name) == "" {
				http.Error(w, "name required", http.StatusBadRequest)
				return
			}
			out, err := st.Campuses().Update(req.Context(), in)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			if err := st.Campuses().Delete(req.Context(), id); err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		})
	})
}

func mountRooms(r chi.Router, st store.Accessor) {
	r.Use(middlewares.RequireRole(domain.RoleAdmin))
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		items, total := listRooms(req, st)
		writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var in domain.Room
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if in.Capacity <= 0 {
			http.Error(w, "capacity must be > 0", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(in.CampusID) == "" || strings.TrimSpace(in.Name) == "" {
			http.Error(w, "campusId and name required", http.StatusBadRequest)
			return
		}
		// ensure campus exists
		if _, err := st.Campuses().Get(req.Context(), in.CampusID); err != nil {
			http.Error(w, "campus not found", http.StatusBadRequest)
			return
		}
		// unique name scoped by campus
		rms, _, _ := st.Rooms().List(req.Context(), store.ListOptions{})
		for _, rm := range rms {
			if rm.CampusID == in.CampusID && strings.EqualFold(rm.Name, in.Name) {
				http.Error(w, "room name exists", http.StatusConflict)
				return
			}
		}
		out, err := st.Rooms().Create(req.Context(), in)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			out, err := st.Rooms().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Put("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			var in domain.Room
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			in.ID = id
			if in.Capacity <= 0 {
				http.Error(w, "capacity must be > 0", http.StatusBadRequest)
				return
			}
			out, err := st.Rooms().Update(req.Context(), in)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			if err := st.Rooms().Delete(req.Context(), id); err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		})
	})
}

func mountClasses(r chi.Router, st store.Accessor) {
	r.Use(middlewares.RequireRole(domain.RoleAdmin))
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		items, total := listClasses(req, st)
		writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var in domain.Class
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if err := validateClass(req, st, in); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		out, err := st.Classes().Create(req.Context(), in)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})
	r.Route("/{id}", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			out, err := st.Classes().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Put("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			var in domain.Class
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			in.ID = id
			if err := validateClass(req, st, in); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			out, err := st.Classes().Update(req.Context(), in)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, out)
		})
		r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			if err := st.Classes().Delete(req.Context(), id); err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		})
	})
}

func mountEvents(r chi.Router, st store.Accessor) {
	r.Use(middlewares.RequireRole(domain.RoleAdmin))
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		items, total, _ := st.Events().List(req.Context(), parseListOptions(req))
		writeJSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		var in domain.Event
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(in.Title) == "" {
			http.Error(w, "title required", http.StatusBadRequest)
			return
		}
		out, err := st.Events().Create(req.Context(), in)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})
}

// Helpers

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func listTerms(req *http.Request, st store.Accessor) ([]domain.Term, int) {
	items, total, _ := st.Terms().List(req.Context(), parseListOptions(req))
	return items, total
}
func listCampuses(req *http.Request, st store.Accessor) ([]domain.Campus, int) {
	items, total, _ := st.Campuses().List(req.Context(), parseListOptions(req))
	return items, total
}
func listRooms(req *http.Request, st store.Accessor) ([]domain.Room, int) {
	items, total, _ := st.Rooms().List(req.Context(), parseListOptions(req))
	return items, total
}
func listClasses(req *http.Request, st store.Accessor) ([]domain.Class, int) {
	items, total, _ := st.Classes().List(req.Context(), parseListOptions(req))
	termID := strings.TrimSpace(req.URL.Query().Get("termId"))
	campusID := strings.TrimSpace(req.URL.Query().Get("campusId"))
	teacherID := strings.TrimSpace(req.URL.Query().Get("teacherId"))
	if termID != "" || campusID != "" || teacherID != "" {
		filtered := make([]domain.Class, 0, len(items))
		for _, c := range items {
			if termID != "" && c.TermID != termID {
				continue
			}
			if campusID != "" && c.CampusID != campusID {
				continue
			}
			if teacherID != "" && c.TeacherID != teacherID {
				continue
			}
			filtered = append(filtered, c)
		}
		return filtered, len(filtered)
	}
	return items, total
}

func parseListOptions(req *http.Request) store.ListOptions {
	q := req.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))
	sortBy := strings.TrimSpace(q.Get("sortBy"))
	desc := q.Get("desc") == "true"

	// Enforce defaults and caps
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	// Allow only createdAt or updatedAt
	switch sortBy {
	case "", "createdAt":
		sortBy = "createdAt"
	case "updatedAt":
		// ok
	default:
		sortBy = "createdAt"
	}
	return store.ListOptions{Limit: limit, Offset: offset, SortBy: sortBy, Desc: desc}
}

func validateClass(req *http.Request, st store.Accessor, in domain.Class) error {
	if strings.TrimSpace(in.TermID) == "" || strings.TrimSpace(in.CampusID) == "" || strings.TrimSpace(in.RoomID) == "" {
		return store.ValidationError{Field: "termId/campusId/roomId", Reason: "required"}
	}
	if in.Weekday < 0 || in.Weekday > 6 {
		return store.ValidationError{Field: "weekday", Reason: "must be 0..6"}
	}
	if strings.TrimSpace(in.StartHHMM) == "" || strings.TrimSpace(in.EndHHMM) == "" {
		return store.ValidationError{Field: "startHHMM/endHHMM", Reason: "required"}
	}
	if in.Capacity <= 0 {
		return store.ValidationError{Field: "capacity", Reason: "must be > 0"}
	}
	// linkage checks
	if _, err := st.Terms().Get(req.Context(), in.TermID); err != nil {
		return store.ValidationError{Field: "termId", Reason: "not found"}
	}
	campus, err := st.Campuses().Get(req.Context(), in.CampusID)
	if err != nil {
		return store.ValidationError{Field: "campusId", Reason: "not found"}
	}
	rm, err := st.Rooms().Get(req.Context(), in.RoomID)
	if err != nil {
		return store.ValidationError{Field: "roomId", Reason: "not found"}
	}
	if rm.CampusID != campus.ID {
		return store.ValidationError{Field: "roomId", Reason: "room not in campus"}
	}
	// time order check (simple lex compare since HH:MM)
	if in.EndHHMM <= in.StartHHMM {
		return store.ValidationError{Field: "endHHMM", Reason: "must be after startHHMM"}
	}
	return nil
}
