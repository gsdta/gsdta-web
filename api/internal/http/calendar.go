package apihttp

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/middlewares"
	"github.com/gsdta/api/internal/store"
)

type calendarItem struct {
	Kind      string    `json:"kind"` // class|event
	Title     string    `json:"title"`
	Start     time.Time `json:"start,omitempty"`
	End       time.Time `json:"end,omitempty"`
	Weekday   int       `json:"weekday,omitempty"`
	StartHHMM string    `json:"startHHMM,omitempty"`
	EndHHMM   string    `json:"endHHMM,omitempty"`
	Location  string    `json:"location,omitempty"`
	ClassID   string    `json:"classId,omitempty"`
	EventID   string    `json:"eventId,omitempty"`
	TermID    string    `json:"termId,omitempty"`
	CampusID  string    `json:"campusId,omitempty"`
}

type calendarResp struct {
	Items []calendarItem `json:"items"`
}

func mountCalendar(r chi.Router, st store.Accessor) {
	r.Get("/calendar/public", func(w http.ResponseWriter, req *http.Request) {
		termID := strings.TrimSpace(req.URL.Query().Get("termId"))
		classes, _, _ := st.Classes().List(req.Context(), store.ListOptions{})
		rooms, _, _ := st.Rooms().List(req.Context(), store.ListOptions{})
		roomName := map[string]string{}
		for _, rm := range rooms {
			roomName[rm.ID] = rm.Name
		}
		items := make([]calendarItem, 0)
		for _, c := range classes {
			if termID != "" && c.TermID != termID {
				continue
			}
			items = append(items, calendarItem{
				Kind:      "class",
				Title:     "Class " + c.Level,
				Weekday:   c.Weekday,
				StartHHMM: c.StartHHMM,
				EndHHMM:   c.EndHHMM,
				Location:  roomName[c.RoomID],
				ClassID:   c.ID,
				TermID:    c.TermID,
				CampusID:  c.CampusID,
			})
		}
		events, _, _ := st.Events().List(req.Context(), store.ListOptions{})
		for _, e := range events {
			items = append(items, calendarItem{
				Kind:     "event",
				Title:    e.Title,
				Start:    e.Start,
				End:      e.End,
				Location: e.Location,
				EventID:  e.ID,
			})
		}
		writeJSON(w, http.StatusOK, calendarResp{Items: items})
	})

	r.With(middlewares.RequireAuth).Get("/calendar/mine", func(w http.ResponseWriter, req *http.Request) {
		p, _ := middlewares.FromContext(req.Context())
		items := make([]calendarItem, 0)
		rooms, _, _ := st.Rooms().List(req.Context(), store.ListOptions{})
		roomName := map[string]string{}
		for _, rm := range rooms {
			roomName[rm.ID] = rm.Name
		}

		if hasRole(p, domain.RoleParent) {
			// guardian ids for this user
			gids := userGuardianIDs(req, st, p.ID)
			// students for these guardians
			students, _, _ := st.Students().List(req.Context(), store.ListOptions{})
			sids := map[string]bool{}
			for _, s := range students {
				if contains(gids, s.GuardianID) {
					sids[s.ID] = true
				}
			}
			// enrollments -> class IDs
			ens, _, _ := st.Enrollments().List(req.Context(), store.ListOptions{})
			classIDs := map[string]bool{}
			for _, e := range ens {
				if sids[e.StudentID] && e.Status == domain.EnrollmentEnrolled {
					classIDs[e.ClassID] = true
				}
			}
			classes, _, _ := st.Classes().List(req.Context(), store.ListOptions{})
			for _, c := range classes {
				if classIDs[c.ID] {
					items = append(items, calendarItem{Kind: "class", Title: "Class " + c.Level, Weekday: c.Weekday, StartHHMM: c.StartHHMM, EndHHMM: c.EndHHMM, Location: roomName[c.RoomID], ClassID: c.ID, TermID: c.TermID, CampusID: c.CampusID})
				}
			}
		}
		if hasRole(p, domain.RoleTeacher) {
			classes, _, _ := st.Classes().List(req.Context(), store.ListOptions{})
			for _, c := range classes {
				if c.TeacherID == p.ID {
					items = append(items, calendarItem{Kind: "class", Title: "Class " + c.Level, Weekday: c.Weekday, StartHHMM: c.StartHHMM, EndHHMM: c.EndHHMM, Location: roomName[c.RoomID], ClassID: c.ID, TermID: c.TermID, CampusID: c.CampusID})
				}
			}
		}
		writeJSON(w, http.StatusOK, calendarResp{Items: items})
	})
}
