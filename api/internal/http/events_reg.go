package apihttp

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gsdta/api/internal/store/memory"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

type eventRegisterReq struct {
	StudentID string `json:"studentId"`
}

type eventRegResp struct {
	ID        string `json:"id"`
	EventID   string `json:"eventId"`
	StudentID string `json:"studentId"`
	Status    string `json:"status"`
}

type listEventReg struct {
	Items []eventRegResp `json:"items"`
	Total int            `json:"total"`
}

func mountEventRegistrations(r chi.Router, st store.Accessor) {
	// Register student to event (parent/admin)
	r.With(middlewares.RequireAnyRole(domain.RoleParent, domain.RoleAdmin)).Post("/events/{id}/registrations", func(w http.ResponseWriter, req *http.Request) {
		eid := chi.URLParam(req, "id")
		var in eventRegisterReq
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if in.StudentID == "" {
			http.Error(w, "studentId required", http.StatusBadRequest)
			return
		}
		// Student ownership for parents
		p, _ := middlewares.FromContext(req.Context())
		if !hasRole(p, domain.RoleAdmin) {
			stRec, err := st.Students().Get(req.Context(), in.StudentID)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
				return
			}
			owners := userGuardianIDs(req, st, p.ID)
			if !contains(owners, stRec.GuardianID) {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
		}
		// Perform apply via memory helper when available
		if ms, ok := st.(*memory.Store); ok {
			rec, err := ms.ApplyEventRegistration(req.Context(), eid, in.StudentID)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusCreated, eventRegResp{ID: rec.ID, EventID: rec.EventID, StudentID: rec.StudentID, Status: rec.Status})
			return
		}
		// Fallback naive apply
		evt, err := st.Events().Get(req.Context(), eid)
		if err != nil {
			http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
			return
		}
		regs, _, _ := st.EventRegistrations().List(req.Context(), store.ListOptions{})
		count := 0
		for _, r := range regs {
			if r.EventID == eid && r.Status == "registered" {
				count++
			}
		}
		status := "registered"
		if evt.Capacity > 0 && count >= evt.Capacity {
			status = "waitlisted"
		}
		rec, err := st.EventRegistrations().Create(req.Context(), domain.EventRegistration{EventID: eid, StudentID: in.StudentID, Status: status})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, eventRegResp{ID: rec.ID, EventID: rec.EventID, StudentID: rec.StudentID, Status: rec.Status})
	})

	// Admin list registrations for an event
	r.With(middlewares.RequireRole(domain.RoleAdmin)).Get("/events/{id}/registrations", func(w http.ResponseWriter, req *http.Request) {
		eid := chi.URLParam(req, "id")
		regs, _, _ := st.EventRegistrations().List(req.Context(), store.ListOptions{})
		items := make([]eventRegResp, 0)
		for _, r := range regs {
			if r.EventID == eid {
				items = append(items, eventRegResp{ID: r.ID, EventID: r.EventID, StudentID: r.StudentID, Status: r.Status})
			}
		}
		writeJSON(w, http.StatusOK, listEventReg{Items: items, Total: len(items)})
	})

	// Cancel registration (parent owning student or admin)
	r.With(middlewares.RequireAuth).Post("/eventRegistrations/{id}:cancel", func(w http.ResponseWriter, req *http.Request) {
		id := chi.URLParam(req, "id")
		rec, err := st.EventRegistrations().Get(req.Context(), id)
		if err != nil {
			http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
			return
		}
		p, _ := middlewares.FromContext(req.Context())
		if !hasRole(p, domain.RoleAdmin) {
			stRec, err := st.Students().Get(req.Context(), rec.StudentID)
			if err != nil {
				http.Error(w, http.StatusText(http.StatusBadRequest), http.StatusBadRequest)
				return
			}
			owners := userGuardianIDs(req, st, p.ID)
			if !contains(owners, stRec.GuardianID) {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
		}
		if ms, ok := st.(*memory.Store); ok {
			dropped, promoted, err := ms.CancelEventRegistrationAndPromote(req.Context(), id)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			resp := map[string]any{"cancelled": eventRegResp{ID: dropped.ID, EventID: dropped.EventID, StudentID: dropped.StudentID, Status: dropped.Status}}
			if promoted != nil {
				resp["promoted"] = eventRegResp{ID: promoted.ID, EventID: promoted.EventID, StudentID: promoted.StudentID, Status: promoted.Status}
			}
			writeJSON(w, http.StatusOK, resp)
			return
		}
		rec.Status = "cancelled"
		rec, _ = st.EventRegistrations().Update(req.Context(), rec)
		writeJSON(w, http.StatusOK, map[string]any{"cancelled": eventRegResp{ID: rec.ID, EventID: rec.EventID, StudentID: rec.StudentID, Status: rec.Status}})
	})
}
