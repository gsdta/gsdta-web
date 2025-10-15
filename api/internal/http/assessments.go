package apihttp

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

type createAssessmentReq struct {
	ClassID  string    `json:"classId"`
	Title    string    `json:"title"`
	Date     time.Time `json:"date"`
	Level    string    `json:"level"`
	MaxScore int       `json:"maxScore"`
}

type scoreIn struct {
	StudentID string  `json:"studentId"`
	Value     float64 `json:"value"`
}

type studentScore struct {
	ID           string    `json:"id"`
	AssessmentID string    `json:"assessmentId"`
	Title        string    `json:"title"`
	Date         time.Time `json:"date"`
	MaxScore     int       `json:"maxScore"`
	Value        float64   `json:"value"`
}

type studentScoresResp struct {
	Items []studentScore `json:"items"`
}

func mountAssessments(r chi.Router, st store.Accessor) {
	// Create assessment (admin or teacher who owns class)
	r.With(middlewares.RequireAnyRole(domain.RoleAdmin, domain.RoleTeacher)).Post("/assessments", func(w http.ResponseWriter, req *http.Request) {
		var in createAssessmentReq
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		if in.ClassID == "" || in.Title == "" || in.MaxScore <= 0 {
			http.Error(w, "classId, title, maxScore required", http.StatusBadRequest)
			return
		}
		cls, err := st.Classes().Get(req.Context(), in.ClassID)
		if err != nil {
			http.Error(w, "class not found", http.StatusBadRequest)
			return
		}
		p, _ := middlewares.FromContext(req.Context())
		if hasRole(p, domain.RoleTeacher) && !hasRole(p, domain.RoleAdmin) {
			if cls.TeacherID != p.ID {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
		}
		a := domain.Assessment{ClassID: in.ClassID, Title: in.Title, Date: in.Date, Level: in.Level, MaxScore: in.MaxScore}
		out, err := st.Assessments().Create(req.Context(), a)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusCreated, out)
	})

	// Bulk score entry for an assessment
	r.With(middlewares.RequireAnyRole(domain.RoleAdmin, domain.RoleTeacher)).Post("/assessments/{id}/scores", func(w http.ResponseWriter, req *http.Request) {
		id := chi.URLParam(req, "id")
		a, err := st.Assessments().Get(req.Context(), id)
		if err != nil {
			http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
			return
		}
		// Check permissions: teacher must own the class
		cls, _ := st.Classes().Get(req.Context(), a.ClassID)
		p, _ := middlewares.FromContext(req.Context())
		if hasRole(p, domain.RoleTeacher) && !hasRole(p, domain.RoleAdmin) {
			if cls.TeacherID != p.ID {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
		}
		// Prepare enrolled set
		ens, _, _ := st.Enrollments().List(req.Context(), store.ListOptions{})
		enrolled := map[string]bool{}
		for _, e := range ens {
			if e.ClassID == a.ClassID && e.Status == domain.EnrollmentEnrolled {
				enrolled[e.StudentID] = true
			}
		}
		var in []scoreIn
		if err := json.NewDecoder(req.Body).Decode(&in); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}
		now := time.Now().UTC()
		// For each input, upsert score for (assessmentId, studentId)
		existing, _, _ := st.Scores().List(req.Context(), store.ListOptions{})
		// index by (assessmentId,studentId)
		idx := map[string]domain.Score{}
		for _, s := range existing {
			if s.AssessmentID == a.ID {
				idx[s.AssessmentID+"|"+s.StudentID] = s
			}
		}
		for _, s := range in {
			if !enrolled[s.StudentID] {
				http.Error(w, "student not enrolled", http.StatusBadRequest)
				return
			}
			if s.Value < 0 || s.Value > float64(a.MaxScore) {
				http.Error(w, "score out of range", http.StatusBadRequest)
				return
			}
			key := a.ID + "|" + s.StudentID
			if cur, ok := idx[key]; ok {
				cur.Value = s.Value
				cur.UpdatedAt = now
				if _, err := st.Scores().Update(req.Context(), cur); err != nil {
					http.Error(w, err.Error(), http.StatusBadRequest)
					return
				}
			} else {
				rec := domain.Score{AssessmentID: a.ID, StudentID: s.StudentID, Value: s.Value}
				if _, err := st.Scores().Create(req.Context(), rec); err != nil {
					http.Error(w, err.Error(), http.StatusBadRequest)
					return
				}
			}
		}
		w.WriteHeader(http.StatusNoContent)
	})

	// Parent read: list scores for a student they own; admin can read any
	r.With(middlewares.RequireAuth).Get("/students/{id}/scores", func(w http.ResponseWriter, req *http.Request) {
		sid := chi.URLParam(req, "id")
		stRec, err := st.Students().Get(req.Context(), sid)
		if err != nil {
			http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
			return
		}
		p, _ := middlewares.FromContext(req.Context())
		if !hasRole(p, domain.RoleAdmin) {
			owners := userGuardianIDs(req, st, p.ID)
			if !contains(owners, stRec.GuardianID) {
				http.Error(w, http.StatusText(http.StatusForbidden), http.StatusForbidden)
				return
			}
		}
		// Collect scores for student and join assessment info
		scs, _, _ := st.Scores().List(req.Context(), store.ListOptions{})
		items := make([]studentScore, 0)
		for _, sc := range scs {
			if sc.StudentID != sid {
				continue
			}
			a, err := st.Assessments().Get(req.Context(), sc.AssessmentID)
			if err != nil {
				continue
			}
			items = append(items, studentScore{ID: sc.ID, AssessmentID: sc.AssessmentID, Title: a.Title, Date: a.Date, MaxScore: a.MaxScore, Value: sc.Value})
		}
		writeJSON(w, http.StatusOK, studentScoresResp{Items: items})
	})
}
