package memory

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

// ApplyEnrollment creates a new enrollment for (studentID,classID).
// If class has capacity, status=enrolled; otherwise waitlisted.
// Duplicate active applications are rejected with ConflictError.
func (s *Store) ApplyEnrollment(_ context.Context, studentID, classID string) (domain.Enrollment, error) {
	s.Lock()
	defer s.Unlock()
	// Ensure class exists
	if _, ok := s.classes[classID]; !ok {
		return domain.Enrollment{}, store.ValidationError{Field: "classId", Reason: "not found"}
	}
	// Ensure student exists
	if _, ok := s.students[studentID]; !ok {
		return domain.Enrollment{}, store.ValidationError{Field: "studentId", Reason: "not found"}
	}
	// Duplicate check
	for _, e := range s.enrollments {
		if e.StudentID == studentID && e.ClassID == classID {
			switch e.Status {
			case domain.EnrollmentDropped, domain.EnrollmentRejected:
				// allow re-apply by creating new record
			default:
				return domain.Enrollment{}, store.ConflictError{Reason: "already applied"}
			}
		}
	}
	capacity := s.classes[classID].Capacity
	curEnrolled := 0
	for _, e := range s.enrollments {
		if e.ClassID == classID && e.Status == domain.EnrollmentEnrolled {
			curEnrolled++
		}
	}
	status := domain.EnrollmentEnrolled
	if curEnrolled >= capacity {
		status = domain.EnrollmentWaitlisted
	}
	now := time.Now().UTC()
	id := newID()
	en := domain.Enrollment{Meta: domain.Meta{ID: id, CreatedAt: now, UpdatedAt: now}, StudentID: studentID, ClassID: classID, Status: status}
	s.enrollments[id] = en
	return en, nil
}

// DropEnrollmentAndPromote drops the enrollment id; if it was enrolled,
// the earliest-created waitlisted enrollment for the same class is promoted to enrolled.
func (s *Store) DropEnrollmentAndPromote(_ context.Context, id string) (domain.Enrollment, *domain.Enrollment, error) {
	s.Lock()
	defer s.Unlock()
	e, ok := s.enrollments[id]
	if !ok {
		return domain.Enrollment{}, nil, store.NotFoundError{Resource: "enrollment", ID: id}
	}
	if e.Status == domain.EnrollmentDropped {
		return e, nil, nil
	}
	oldStatus := e.Status
	e.Status = domain.EnrollmentDropped
	e.UpdatedAt = time.Now().UTC()
	s.enrollments[id] = e
	var promoted *domain.Enrollment
	if oldStatus == domain.EnrollmentEnrolled {
		// promote earliest waitlisted
		wl := make([]domain.Enrollment, 0)
		for _, x := range s.enrollments {
			if x.ClassID == e.ClassID && x.Status == domain.EnrollmentWaitlisted {
				wl = append(wl, x)
			}
		}
		sort.Slice(wl, func(i, j int) bool { return wl[i].CreatedAt.Before(wl[j].CreatedAt) })
		if len(wl) > 0 {
			n := wl[0]
			n.Status = domain.EnrollmentEnrolled
			n.UpdatedAt = time.Now().UTC()
			s.enrollments[n.ID] = n
			promoted = &n
		}
	}
	return e, promoted, nil
}

// SetEnrollmentStatus updates status explicitly; admin action.
func (s *Store) SetEnrollmentStatus(_ context.Context, id string, status domain.EnrollmentStatus) (domain.Enrollment, error) {
	s.Lock()
	defer s.Unlock()
	e, ok := s.enrollments[id]
	if !ok {
		return domain.Enrollment{}, store.NotFoundError{Resource: "enrollment", ID: id}
	}
	// For enrolling, ensure capacity
	if status == domain.EnrollmentEnrolled {
		capacity := s.classes[e.ClassID].Capacity
		cur := 0
		for _, x := range s.enrollments {
			if x.ClassID == e.ClassID && x.Status == domain.EnrollmentEnrolled {
				cur++
			}
		}
		// if already enrolled, allow
		if e.Status != domain.EnrollmentEnrolled && cur >= capacity {
			return domain.Enrollment{}, store.ConflictError{Reason: "class full"}
		}
	}
	e.Status = status
	e.UpdatedAt = time.Now().UTC()
	s.enrollments[id] = e
	return e, nil
}

// GetEnrollment returns by id.
func (s *Store) GetEnrollment(_ context.Context, id string) (domain.Enrollment, error) {
	s.RLock()
	defer s.RUnlock()
	if e, ok := s.enrollments[id]; ok {
		return e, nil
	}
	return domain.Enrollment{}, store.NotFoundError{Resource: "enrollment", ID: id}
}

// Err helpers
var ErrInvalidStatus = errors.New("invalid status")
