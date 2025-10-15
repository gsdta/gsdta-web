package apihttp

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

type applyReq struct {
	StudentID string `json:"studentId"`
	ClassID   string `json:"classId"`
}

type setStatusReq struct {
	Status domain.EnrollmentStatus `json:"status"`
}

type dropResp struct {
	Dropped  domain.Enrollment  `json:"dropped"`
	Promoted *domain.Enrollment `json:"promoted,omitempty"`
}

func mountEnrollments(r chi.Router, st store.Accessor) {
	// Public apply endpoint (no auth)
	r.Post("/enrollments:apply", func(w http.ResponseWriter, req *http.Request) {
		var in applyReq
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if in.StudentID == "" || in.ClassID == "" {
			http.Error(w, "studentId and classId required", http.StatusBadRequest)
			return
		}

		if ms, ok := st.(memoryStoreShim); ok {
			en, err := ms.ApplyEnrollment(req.Context(), in.StudentID, in.ClassID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusCreated, en)
			return
		}
		// Fallback: naive check using repos (less atomic, but for other impls we can just create with basic logic)
		// Count enrolled
		classes, err := st.Classes().Get(req.Context(), in.ClassID)
		if err != nil {
			http.Error(w, "classId not found", http.StatusBadRequest)
			return
		}
		_ = classes
		enrolled := 0
		ens, _, _ := st.Enrollments().List(req.Context(), store.ListOptions{})
		for _, e := range ens {
			if e.ClassID == in.ClassID && e.Status == domain.EnrollmentEnrolled {
				enrolled++
			}
		}
		status := domain.EnrollmentEnrolled
		if enrolled >= classes.Capacity {
			status = domain.EnrollmentWaitlisted
		}
		en, err := st.Enrollments().Create(req.Context(), domain.Enrollment{StudentID: in.StudentID, ClassID: in.ClassID, Status: status})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, en)
	})

	// Admin-only actions
	r.Route("/enrollments", func(r chi.Router) {
		r.Use(middlewares.RequireRole(domain.RoleAdmin))

		// GET by id
		r.Get("/{id}", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			if ms, ok := st.(memoryStoreShim); ok {
				en, err := ms.GetEnrollment(req.Context(), id)
				if err != nil {
					http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
					return
				}
				writeJSON(w, http.StatusOK, en)
				return
			}
			// Fallback to repo
			en, err := st.Enrollments().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			writeJSON(w, http.StatusOK, en)
		})

		// Set status
		r.Post("/{id}:setStatus", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			var in setStatusReq
			if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
				http.Error(w, "invalid json", http.StatusBadRequest)
				return
			}
			if ms, ok := st.(memoryStoreShim); ok {
				en, err := ms.SetEnrollmentStatus(req.Context(), id, in.Status)
				if err != nil {
					http.Error(w, err.Error(), http.StatusBadRequest)
					return
				}
				writeJSON(w, http.StatusOK, en)
				return
			}
			// Fallback: update via repo
			en, err := st.Enrollments().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			en.Status = in.Status
			en, err = st.Enrollments().Update(req.Context(), en)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusOK, en)
		})

		// Drop with promotion
		r.Post("/{id}:drop", func(w http.ResponseWriter, req *http.Request) {
			id := chi.URLParam(req, "id")
			if ms, ok := st.(memoryStoreShim); ok {
				dropped, promoted, err := ms.DropEnrollmentAndPromote(req.Context(), id)
				if err != nil {
					http.Error(w, err.Error(), http.StatusBadRequest)
					return
				}
				writeJSON(w, http.StatusOK, dropResp{Dropped: dropped, Promoted: promoted})
				return
			}
			en, err := st.Enrollments().Get(req.Context(), id)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			}
			en.Status = domain.EnrollmentDropped
			en, err = st.Enrollments().Update(req.Context(), en)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusOK, dropResp{Dropped: en})
		})
	})
}

// memoryStoreShim allows using memory.Store-specific operations via interface checks.
// We keep it in the http layer to avoid import cycles.
type memoryStoreShim interface {
	ApplyEnrollment(ctx context.Context, studentID, classID string) (domain.Enrollment, error)
	SetEnrollmentStatus(ctx context.Context, id string, status domain.EnrollmentStatus) (domain.Enrollment, error)
	DropEnrollmentAndPromote(ctx context.Context, id string) (domain.Enrollment, *domain.Enrollment, error)
	GetEnrollment(ctx context.Context, id string) (domain.Enrollment, error)
}
