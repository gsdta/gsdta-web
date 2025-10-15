package apihttp

import (
	"net/http"
	"sort"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

type enrollCount struct {
	ClassID string `json:"classId"`
	Level   string `json:"level"`
	Count   int    `json:"count"`
}

type enrollReport struct {
	Items []enrollCount `json:"items"`
}

type attendanceRate struct {
	ClassID   string `json:"classId"`
	StudentID string `json:"studentId"`
	Present   int    `json:"present"`
	Total     int    `json:"total"`
}

type attendanceReport struct {
	Items []attendanceRate `json:"items"`
}

type scoreSummary struct {
	StudentID string  `json:"studentId"`
	Count     int     `json:"count"`
	Avg       float64 `json:"avg"`
}

type scoreReport struct {
	Items []scoreSummary `json:"items"`
}

type regItem struct {
	EventID   string `json:"eventId"`
	StudentID string `json:"studentId"`
	Status    string `json:"status"`
}

type regReport struct {
	Items []regItem `json:"items"`
}

func mountReports(r chi.Router, st store.Accessor) {
	r.With(middlewares.RequireRole(domain.RoleAdmin)).Route("/reports", func(r chi.Router) {
		r.Get("/enrollments", func(w http.ResponseWriter, req *http.Request) {
			ens, _, _ := st.Enrollments().List(req.Context(), store.ListOptions{})
			m := map[string]int{}
			for _, e := range ens {
				if e.Status == domain.EnrollmentEnrolled {
					m[e.ClassID]++
				}
			}
			// attach level by class
			items := make([]enrollCount, 0, len(m))
			for classID, v := range m {
				cls, err := st.Classes().Get(req.Context(), classID)
				level := ""
				if err == nil {
					level = cls.Level
				}
				items = append(items, enrollCount{ClassID: classID, Level: level, Count: v})
			}
			sort.Slice(items, func(i, j int) bool { return items[i].ClassID < items[j].ClassID })
			writeJSON(w, http.StatusOK, enrollReport{Items: items})
		})
		r.Get("/attendance", func(w http.ResponseWriter, req *http.Request) {
			atts, _, _ := st.Attendances().List(req.Context(), store.ListOptions{})
			m := map[string]*attendanceRate{} // key class|student
			for _, a := range atts {
				for _, rcd := range a.Records {
					key := a.ClassID + "|" + rcd.StudentID
					v, ok := m[key]
					if !ok {
						v = &attendanceRate{ClassID: a.ClassID, StudentID: rcd.StudentID}
						m[key] = v
					}
					v.Total++
					if rcd.Status == domain.AttendancePresent || rcd.Status == domain.AttendanceLate {
						v.Present++
					}
				}
			}
			items := make([]attendanceRate, 0, len(m))
			for _, v := range m {
				items = append(items, *v)
			}
			writeJSON(w, http.StatusOK, attendanceReport{Items: items})
		})
		r.Get("/scores", func(w http.ResponseWriter, req *http.Request) {
			termID := req.URL.Query().Get("termId")
			scs, _, _ := st.Scores().List(req.Context(), store.ListOptions{})
			m := map[string]struct {
				total float64
				n     int
			}{}
			for _, s := range scs {
				a, err := st.Assessments().Get(req.Context(), s.AssessmentID)
				if err != nil {
					continue
				}
				if termID != "" {
					cls, err := st.Classes().Get(req.Context(), a.ClassID)
					if err != nil || cls.TermID != termID {
						continue
					}
				}
				v := m[s.StudentID]
				v.total += s.Value
				v.n++
				m[s.StudentID] = v
			}
			items := make([]scoreSummary, 0, len(m))
			for sid, v := range m {
				avg := 0.0
				if v.n > 0 {
					avg = v.total / float64(v.n)
				}
				items = append(items, scoreSummary{StudentID: sid, Count: v.n, Avg: avg})
			}
			writeJSON(w, http.StatusOK, scoreReport{Items: items})
		})
		r.Get("/eventRegistrations", func(w http.ResponseWriter, req *http.Request) {
			regs, _, _ := st.EventRegistrations().List(req.Context(), store.ListOptions{})
			items := make([]regItem, 0, len(regs))
			for _, r := range regs {
				items = append(items, regItem{EventID: r.EventID, StudentID: r.StudentID, Status: r.Status})
			}
			writeJSON(w, http.StatusOK, regReport{Items: items})
		})
	})
}
