package memory

import (
	"context"
	"time"

	"github.com/gsdta/api/internal/domain"
)

// SeedResult captures IDs of seeded entities.
type SeedResult struct {
	TermID     string
	CampusID   string
	RoomID     string
	ClassID    string
	GuardianID string
	StudentID  string
}

// SeedDev populates minimal dev data in the in-memory store.
// It creates: one term, one campus, one room, one class, one guardian, one student.
func SeedDev(s *Store) (SeedResult, error) {
	ctx := context.Background()
	res := SeedResult{}

	term, err := s.Terms().Create(ctx, domain.Term{
		Name:      "Fall Dev",
		StartDate: time.Now().UTC().AddDate(0, 0, -7),
		EndDate:   time.Now().UTC().AddDate(0, 2, 0),
	})
	if err != nil {
		return res, err
	}
	res.TermID = term.ID

	campus, err := s.Campuses().Create(ctx, domain.Campus{Name: "Main"})
	if err != nil {
		return res, err
	}
	res.CampusID = campus.ID

	rm, err := s.Rooms().Create(ctx, domain.Room{CampusID: campus.ID, Name: "R101", Capacity: 12})
	if err != nil {
		return res, err
	}
	res.RoomID = rm.ID

	cls, err := s.Classes().Create(ctx, domain.Class{
		TermID:    term.ID,
		CampusID:  campus.ID,
		RoomID:    rm.ID,
		TeacherID: "", // none for now
		Level:     "L1",
		Weekday:   2,
		StartHHMM: "15:30",
		EndHHMM:   "16:30",
		Capacity:  12,
	})
	if err != nil {
		return res, err
	}
	res.ClassID = cls.ID

	g, err := s.Guardians().Create(ctx, domain.Guardian{UserID: "dev-parent", Phone: "+1-555-0100"})
	if err != nil {
		return res, err
	}
	res.GuardianID = g.ID

	st, err := s.Students().Create(ctx, domain.Student{GuardianID: g.ID, FirstName: "Dev", LastName: "Student", DOB: time.Now().AddDate(-10, 0, 0)})
	if err != nil {
		return res, err
	}
	res.StudentID = st.ID

	return res, nil
}
