package apihttp

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

type attendanceReq struct {
	Records        []domain.AttendanceRecord `json:"records"`
	MarkAllPresent bool                      `json:"markAllPresent"`
}

func mountAttendance(r chi.Router, st store.Accessor) {
	// GET attendance
	r.With(middlewares.RequireAnyRole(domain.RoleTeacher, domain.RoleAdmin)).Get("/classes/{id}/attendance/{date}", func(w http.ResponseWriter, req *http.Request) {
		classID := chi.URLParam(req, "id")
		date := chi.URLParam(req, "date")
		p, _ := middlewares.FromContext(req.Context())
		cls, err := st.Classes().Get(req.Context(), classID)
		if err != nil {
			http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
			return
		}
		if !(hasRole(p, domain.RoleAdmin) || (hasRole(p, domain.RoleTeacher) && cls.TeacherID == p.ID)) {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}
		// use memory helper if available
		if ms, ok := st.(interface {
			GetAttendanceByClassDate(ctx context.Context, classID, date string) (domain.Attendance, bool)
		}); ok {
			if a, okk := ms.GetAttendanceByClassDate(req.Context(), classID, date); okk {
				writeJSON(w, http.StatusOK, a)
				return
			}
			writeJSON(w, http.StatusOK, domain.Attendance{Meta: domain.Meta{}, ClassID: classID, Date: date, Records: []domain.AttendanceRecord{}})
			return
		}
		// fallback: search via List
		atts, _, _ := st.Attendances().List(req.Context(), store.ListOptions{})
		for _, a := range atts {
			if a.ClassID == classID && a.Date == date {
				writeJSON(w, http.StatusOK, a)
				return
			}
		}
		writeJSON(w, http.StatusOK, domain.Attendance{ClassID: classID, Date: date, Records: []domain.AttendanceRecord{}})
	})

	// PUT/POST attendance (bulk upsert)
	upsert := func(w http.ResponseWriter, req *http.Request) {
		classID := chi.URLParam(req, "id")
		date := chi.URLParam(req, "date")
		p, _ := middlewares.FromContext(req.Context())
		cls, err := st.Classes().Get(req.Context(), classID)
		if err != nil {
			http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
			return
		}
		if !(hasRole(p, domain.RoleAdmin) || (hasRole(p, domain.RoleTeacher) && cls.TeacherID == p.ID)) {
			http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
			return
		}
		var in attendanceReq
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}

		// Build base record map from existing attendance if any
		base := map[string]domain.AttendanceRecord{}
		if msGet, ok := st.(interface {
			GetAttendanceByClassDate(ctx context.Context, classID, date string) (domain.Attendance, bool)
		}); ok {
			if existing, ok2 := msGet.GetAttendanceByClassDate(req.Context(), classID, date); ok2 {
				for _, r := range existing.Records {
					base[r.StudentID] = r
				}
			}
		} else {
			// fallback search via list
			atts, _, _ := st.Attendances().List(req.Context(), store.ListOptions{})
			for _, a := range atts {
				if a.ClassID == classID && a.Date == date {
					for _, r := range a.Records {
						base[r.StudentID] = r
					}
				}
			}
		}

		// If MarkAllPresent, initialize base from enrolled students (overrides missing base)
		if in.MarkAllPresent {
			ens, _, _ := st.Enrollments().List(req.Context(), store.ListOptions{})
			now := time.Now().UTC()
			for _, e := range ens {
				if e.ClassID == classID && e.Status == domain.EnrollmentEnrolled {
					base[e.StudentID] = domain.AttendanceRecord{StudentID: e.StudentID, Status: domain.AttendancePresent, At: now}
				}
			}
		}

		// Apply incoming Records as updates onto base
		now := time.Now().UTC()
		for _, rcd := range in.Records {
			if rcd.At.IsZero() {
				rcd.At = now
			}
			base[rcd.StudentID] = rcd
		}

		// Convert back to slice
		merged := make([]domain.AttendanceRecord, 0, len(base))
		for _, r := range base {
			merged = append(merged, r)
		}

		if ms, ok := st.(interface {
			PutAttendanceByClassDate(ctx context.Context, classID, date string, records []domain.AttendanceRecord) (domain.Attendance, error)
		}); ok {
			a, err := ms.PutAttendanceByClassDate(req.Context(), classID, date, merged)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeJSON(w, http.StatusOK, a)
			return
		}
		// fallback: create or update first match
		atts, _, _ := st.Attendances().List(req.Context(), store.ListOptions{})
		for _, a := range atts {
			if a.ClassID == classID && a.Date == date {
				a.Records = merged
				a, _ = st.Attendances().Update(req.Context(), a)
				writeJSON(w, http.StatusOK, a)
				return
			}
		}
		a, _ := st.Attendances().Create(req.Context(), domain.Attendance{ClassID: classID, Date: date, Records: merged})
		writeJSON(w, http.StatusOK, a)
	}

	r.With(middlewares.RequireAnyRole(domain.RoleTeacher, domain.RoleAdmin)).Put("/classes/{id}/attendance/{date}", upsert)
	r.With(middlewares.RequireAnyRole(domain.RoleTeacher, domain.RoleAdmin)).Post("/classes/{id}/attendance/{date}", upsert)
}
