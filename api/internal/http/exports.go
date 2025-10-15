package apihttp

import (
	"encoding/csv"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/config"
	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

func mountExports(r chi.Router, st store.Accessor, _ config.Config) {
	// Admin-only CSV exports
	r.With(middlewares.RequireRole(domain.RoleAdmin)).Route("/exports", func(r chi.Router) {
		// Attendance CSV: optional classId filter
		r.Get("/attendance.csv", func(w http.ResponseWriter, req *http.Request) {
			classID := req.URL.Query().Get("classId")
			atts, _, _ := st.Attendances().List(req.Context(), store.ListOptions{})
			type row struct{ classID, date, studentID, status, at string }
			rows := make([]row, 0, 128)
			for _, a := range atts {
				if classID != "" && a.ClassID != classID {
					continue
				}
				for _, r := range a.Records {
					rows = append(rows, row{classID: a.ClassID, date: a.Date, studentID: r.StudentID, status: string(r.Status), at: r.At.UTC().Format(time.RFC3339)})
				}
			}
			sort.Slice(rows, func(i, j int) bool {
				if rows[i].classID != rows[j].classID {
					return rows[i].classID < rows[j].classID
				}
				if rows[i].date != rows[j].date {
					return rows[i].date < rows[j].date
				}
				if rows[i].studentID != rows[j].studentID {
					return rows[i].studentID < rows[j].studentID
				}
				if rows[i].at != rows[j].at {
					return rows[i].at < rows[j].at
				}
				return rows[i].status < rows[j].status
			})
			w.Header().Set("Content-Type", "text/csv")
			w.Header().Set("Content-Disposition", "attachment; filename=attendance.csv")
			cw := csv.NewWriter(w)
			_ = cw.Write([]string{"classId", "date", "studentId", "status", "at"})
			for _, r := range rows {
				_ = cw.Write([]string{r.classID, r.date, r.studentID, r.status, r.at})
			}
			cw.Flush()
		})

		// Scores CSV: optional termId filter (by class term)
		r.Get("/scores.csv", func(w http.ResponseWriter, req *http.Request) {
			termID := req.URL.Query().Get("termId")
			scs, _, _ := st.Scores().List(req.Context(), store.ListOptions{})
			type row struct{ assessmentID, classID, studentID, value string }
			rows := make([]row, 0, 128)
			for _, s := range scs {
				a, err := st.Assessments().Get(req.Context(), s.AssessmentID)
				if err != nil {
					continue
				}
				cls, err := st.Classes().Get(req.Context(), a.ClassID)
				if err != nil {
					continue
				}
				if termID != "" && cls.TermID != termID {
					continue
				}
				rows = append(rows, row{assessmentID: s.AssessmentID, classID: a.ClassID, studentID: s.StudentID, value: formatFloatCSV(s.Value)})
			}
			sort.Slice(rows, func(i, j int) bool {
				if rows[i].classID != rows[j].classID {
					return rows[i].classID < rows[j].classID
				}
				if rows[i].assessmentID != rows[j].assessmentID {
					return rows[i].assessmentID < rows[j].assessmentID
				}
				if rows[i].studentID != rows[j].studentID {
					return rows[i].studentID < rows[j].studentID
				}
				return rows[i].value < rows[j].value
			})
			w.Header().Set("Content-Type", "text/csv")
			w.Header().Set("Content-Disposition", "attachment; filename=scores.csv")
			cw := csv.NewWriter(w)
			_ = cw.Write([]string{"assessmentId", "classId", "studentId", "value"})
			for _, r := range rows {
				_ = cw.Write([]string{r.assessmentID, r.classID, r.studentID, r.value})
			}
			cw.Flush()
		})

		// Event registrations CSV: optional eventId filter
		r.Get("/eventRegistrations.csv", func(w http.ResponseWriter, req *http.Request) {
			eventID := req.URL.Query().Get("eventId")
			regs, _, _ := st.EventRegistrations().List(req.Context(), store.ListOptions{})
			type row struct{ eventID, studentID, status string }
			rows := make([]row, 0, 64)
			for _, r := range regs {
				if eventID != "" && r.EventID != eventID {
					continue
				}
				rows = append(rows, row{eventID: r.EventID, studentID: r.StudentID, status: r.Status})
			}
			sort.Slice(rows, func(i, j int) bool {
				if rows[i].eventID != rows[j].eventID {
					return rows[i].eventID < rows[j].eventID
				}
				if rows[i].studentID != rows[j].studentID {
					return rows[i].studentID < rows[j].studentID
				}
				return rows[i].status < rows[j].status
			})
			w.Header().Set("Content-Type", "text/csv")
			w.Header().Set("Content-Disposition", "attachment; filename=eventRegistrations.csv")
			cw := csv.NewWriter(w)
			_ = cw.Write([]string{"eventId", "studentId", "status"})
			for _, r := range rows {
				_ = cw.Write([]string{r.eventID, r.studentID, r.status})
			}
			cw.Flush()
		})
	})
}

// formatFloatCSV ensures consistent formatting without trailing zeros issues.
func formatFloatCSV(v float64) string {
	// For simplicity, trim to up to 6 decimals but drop trailing zeros
	s := strconv.FormatFloat(v, 'f', -1, 64)
	return s
}
