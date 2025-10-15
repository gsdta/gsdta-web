package memory

import (
	"context"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

// Store is a concurrency-safe in-memory implementation of store.Accessor.
type Store struct {
	sync.RWMutex
	students      map[string]domain.Student
	guardians     map[string]domain.Guardian
	terms         map[string]domain.Term
	campuses      map[string]domain.Campus
	rooms         map[string]domain.Room
	classes       map[string]domain.Class
	enrollments   map[string]domain.Enrollment
	events        map[string]domain.Event
	attendances   map[string]domain.Attendance
	assessments   map[string]domain.Assessment
	scores        map[string]domain.Score
	registrations map[string]domain.EventRegistration
	announcements map[string]domain.Announcement
}

func New() *Store {
	return &Store{
		students:      make(map[string]domain.Student),
		guardians:     make(map[string]domain.Guardian),
		terms:         make(map[string]domain.Term),
		campuses:      make(map[string]domain.Campus),
		rooms:         make(map[string]domain.Room),
		classes:       make(map[string]domain.Class),
		enrollments:   make(map[string]domain.Enrollment),
		events:        make(map[string]domain.Event),
		attendances:   make(map[string]domain.Attendance),
		assessments:   make(map[string]domain.Assessment),
		scores:        make(map[string]domain.Score),
		registrations: make(map[string]domain.EventRegistration),
		announcements: make(map[string]domain.Announcement),
	}
}

// Accessor methods
func (s *Store) Students() store.StudentRepo                     { return (*studentRepo)(s) }
func (s *Store) Guardians() store.GuardianRepo                   { return (*guardianRepo)(s) }
func (s *Store) Terms() store.TermRepo                           { return (*termRepo)(s) }
func (s *Store) Campuses() store.CampusRepo                      { return (*campusRepo)(s) }
func (s *Store) Rooms() store.RoomRepo                           { return (*roomRepo)(s) }
func (s *Store) Classes() store.ClassRepo                        { return (*classRepo)(s) }
func (s *Store) Enrollments() store.EnrollmentRepo               { return (*enrollmentRepo)(s) }
func (s *Store) Events() store.EventRepo                         { return (*eventRepo)(s) }
func (s *Store) Attendances() store.AttendanceRepo               { return (*attendanceRepo)(s) }
func (s *Store) Assessments() store.AssessmentRepo               { return (*assessmentRepo)(s) }
func (s *Store) Scores() store.ScoreRepo                         { return (*scoreRepo)(s) }
func (s *Store) EventRegistrations() store.EventRegistrationRepo { return (*eventRegistrationRepo)(s) }
func (s *Store) Announcements() store.AnnouncementRepo           { return (*announcementRepo)(s) }

// Event registration helpers
func (s *Store) applyEventRegistration(_ context.Context, eventID, studentID string) (domain.EventRegistration, error) {
	s.Lock()
	defer s.Unlock()
	// ensure event exists
	evt, ok := s.events[eventID]
	if !ok {
		return domain.EventRegistration{}, store.ValidationError{Field: "eventId", Reason: "not found"}
	}
	// ensure student exists
	if _, ok := s.students[studentID]; !ok {
		return domain.EventRegistration{}, store.ValidationError{Field: "studentId", Reason: "not found"}
	}
	// dedupe
	for _, r := range s.registrations {
		if r.EventID == eventID && r.StudentID == studentID {
			if r.Status == "cancelled" { // allow re-register as new record
				break
			}
			return domain.EventRegistration{}, store.ConflictError{Reason: "already registered"}
		}
	}
	// count registered
	cur := 0
	for _, r := range s.registrations {
		if r.EventID == eventID && r.Status == "registered" {
			cur++
		}
	}
	status := "registered"
	if evt.Capacity > 0 && cur >= evt.Capacity {
		status = "waitlisted"
	}
	now := time.Now().UTC()
	id := newID()
	rec := domain.EventRegistration{Meta: domain.Meta{ID: id, CreatedAt: now, UpdatedAt: now}, EventID: eventID, StudentID: studentID, Status: status}
	s.registrations[id] = rec
	return rec, nil
}

func (s *Store) cancelEventRegistrationAndPromote(_ context.Context, id string) (domain.EventRegistration, *domain.EventRegistration, error) {
	s.Lock()
	defer s.Unlock()
	rec, ok := s.registrations[id]
	if !ok {
		return domain.EventRegistration{}, nil, store.NotFoundError{Resource: "eventRegistration", ID: id}
	}
	if rec.Status == "cancelled" {
		return rec, nil, nil
	}
	old := rec.Status
	rec.Status = "cancelled"
	rec.UpdatedAt = time.Now().UTC()
	s.registrations[id] = rec
	var promoted *domain.EventRegistration
	if old == "registered" {
		// find earliest waitlisted for same event
		wl := make([]domain.EventRegistration, 0)
		for _, r := range s.registrations {
			if r.EventID == rec.EventID && r.Status == "waitlisted" {
				wl = append(wl, r)
			}
		}
		sort.Slice(wl, func(i, j int) bool { return wl[i].CreatedAt.Before(wl[j].CreatedAt) })
		if len(wl) > 0 {
			n := wl[0]
			n.Status = "registered"
			n.UpdatedAt = time.Now().UTC()
			s.registrations[n.ID] = n
			promoted = &n
		}
	}
	return rec, promoted, nil
}

// Helpers
func newID() string { return uuid.NewString() }

func applyMetaOnCreate[T any](m domain.Meta, apply func(domain.Meta) T) T {
	now := time.Now().UTC()
	if m.ID == "" {
		m.ID = newID()
	}
	if m.CreatedAt.IsZero() {
		m.CreatedAt = now
	}
	m.UpdatedAt = now
	return apply(m)
}

func applyMetaOnUpdate[T any](m domain.Meta, apply func(domain.Meta) T) T {
	m.UpdatedAt = time.Now().UTC()
	return apply(m)
}

func sortAndPage[T any](arr []T, opts store.ListOptions, createdAt func(i int) time.Time, updatedAt func(i int) time.Time) []T {
	// Sorting
	switch opts.SortBy {
	case "updatedAt":
		sort.Slice(arr, func(i, j int) bool {
			if opts.Desc {
				return updatedAt(i).After(updatedAt(j))
			}
			return updatedAt(i).Before(updatedAt(j))
		})
	default: // createdAt
		sort.Slice(arr, func(i, j int) bool {
			if opts.Desc {
				return createdAt(i).After(createdAt(j))
			}
			return createdAt(i).Before(createdAt(j))
		})
	}
	// Pagination
	start := opts.Offset
	if start < 0 {
		start = 0
	}
	if start > len(arr) {
		return []T{}
	}
	end := len(arr)
	if opts.Limit > 0 && start+opts.Limit < end {
		end = start + opts.Limit
	}
	return arr[start:end]
}

// Convenience helpers used by HTTP layer
func (s *Store) GetAttendanceByClassDate(_ context.Context, classID, date string) (domain.Attendance, bool) {
	s.RLock()
	defer s.RUnlock()
	for _, a := range s.attendances {
		if a.ClassID == classID && a.Date == date {
			return a, true
		}
	}
	return domain.Attendance{}, false
}

func (s *Store) PutAttendanceByClassDate(_ context.Context, classID, date string, records []domain.AttendanceRecord) (domain.Attendance, error) {
	s.Lock()
	defer s.Unlock()
	// ensure class exists
	if _, ok := s.classes[classID]; !ok {
		return domain.Attendance{}, store.ValidationError{Field: "classId", Reason: "not found"}
	}
	// find existing
	var id string
	var exists bool
	for _, a := range s.attendances {
		if a.ClassID == classID && a.Date == date {
			id = a.ID
			exists = true
			break
		}
	}
	now := time.Now().UTC()
	if !exists {
		id = newID()
		a := domain.Attendance{Meta: domain.Meta{ID: id, CreatedAt: now, UpdatedAt: now}, ClassID: classID, Date: date, Records: records}
		s.attendances[id] = a
		return a, nil
	}
	a := s.attendances[id]
	a.Records = records
	a.UpdatedAt = now
	s.attendances[id] = a
	return a, nil
}

// studentRepo

type studentRepo Store

func (r *studentRepo) Create(_ context.Context, s domain.Student) (domain.Student, error) { // nolint: revive
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if s.ID != "" {
		if _, ok := rs.students[s.ID]; ok {
			return domain.Student{}, store.ConflictError{Reason: "student id exists"}
		}
	}
	out := applyMetaOnCreate(s.Meta, func(m domain.Meta) domain.Student { s.Meta = m; return s })
	rs.students[out.ID] = out
	return out, nil
}

func (r *studentRepo) Get(_ context.Context, id string) (domain.Student, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.students[id]
	if !ok {
		return domain.Student{}, store.NotFoundError{Resource: "student", ID: id}
	}
	return v, nil
}

func (r *studentRepo) Update(_ context.Context, s domain.Student) (domain.Student, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.students[s.ID]; !ok {
		return domain.Student{}, store.NotFoundError{Resource: "student", ID: s.ID}
	}
	out := applyMetaOnUpdate(s.Meta, func(m domain.Meta) domain.Student { s.Meta = m; return s })
	rs.students[out.ID] = out
	return out, nil
}

func (r *studentRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.students[id]; !ok {
		return store.NotFoundError{Resource: "student", ID: id}
	}
	delete(rs.students, id)
	return nil
}

func (r *studentRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Student, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Student, 0, len(rs.students))
	for _, v := range rs.students {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// guardianRepo

type guardianRepo Store

func (r *guardianRepo) Create(_ context.Context, g domain.Guardian) (domain.Guardian, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if g.ID != "" {
		if _, ok := rs.guardians[g.ID]; ok {
			return domain.Guardian{}, store.ConflictError{Reason: "guardian id exists"}
		}
	}
	out := applyMetaOnCreate(g.Meta, func(m domain.Meta) domain.Guardian { g.Meta = m; return g })
	rs.guardians[out.ID] = out
	return out, nil
}

func (r *guardianRepo) Get(_ context.Context, id string) (domain.Guardian, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.guardians[id]
	if !ok {
		return domain.Guardian{}, store.NotFoundError{Resource: "guardian", ID: id}
	}
	return v, nil
}

func (r *guardianRepo) Update(_ context.Context, g domain.Guardian) (domain.Guardian, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.guardians[g.ID]; !ok {
		return domain.Guardian{}, store.NotFoundError{Resource: "guardian", ID: g.ID}
	}
	out := applyMetaOnUpdate(g.Meta, func(m domain.Meta) domain.Guardian { g.Meta = m; return g })
	rs.guardians[out.ID] = out
	return out, nil
}

func (r *guardianRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.guardians[id]; !ok {
		return store.NotFoundError{Resource: "guardian", ID: id}
	}
	delete(rs.guardians, id)
	return nil
}

func (r *guardianRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Guardian, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Guardian, 0, len(rs.guardians))
	for _, v := range rs.guardians {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// termRepo

type termRepo Store

func (r *termRepo) Create(_ context.Context, t domain.Term) (domain.Term, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if t.ID != "" {
		if _, ok := rs.terms[t.ID]; ok {
			return domain.Term{}, store.ConflictError{Reason: "term id exists"}
		}
	}
	out := applyMetaOnCreate(t.Meta, func(m domain.Meta) domain.Term { t.Meta = m; return t })
	rs.terms[out.ID] = out
	return out, nil
}

func (r *termRepo) Get(_ context.Context, id string) (domain.Term, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.terms[id]
	if !ok {
		return domain.Term{}, store.NotFoundError{Resource: "term", ID: id}
	}
	return v, nil
}

func (r *termRepo) Update(_ context.Context, t domain.Term) (domain.Term, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.terms[t.ID]; !ok {
		return domain.Term{}, store.NotFoundError{Resource: "term", ID: t.ID}
	}
	out := applyMetaOnUpdate(t.Meta, func(m domain.Meta) domain.Term { t.Meta = m; return t })
	rs.terms[out.ID] = out
	return out, nil
}

func (r *termRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.terms[id]; !ok {
		return store.NotFoundError{Resource: "term", ID: id}
	}
	delete(rs.terms, id)
	return nil
}

func (r *termRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Term, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Term, 0, len(rs.terms))
	for _, v := range rs.terms {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// campusRepo

type campusRepo Store

func (r *campusRepo) Create(_ context.Context, c domain.Campus) (domain.Campus, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if c.ID != "" {
		if _, ok := rs.campuses[c.ID]; ok {
			return domain.Campus{}, store.ConflictError{Reason: "campus id exists"}
		}
	}
	out := applyMetaOnCreate(c.Meta, func(m domain.Meta) domain.Campus { c.Meta = m; return c })
	rs.campuses[out.ID] = out
	return out, nil
}

func (r *campusRepo) Get(_ context.Context, id string) (domain.Campus, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.campuses[id]
	if !ok {
		return domain.Campus{}, store.NotFoundError{Resource: "campus", ID: id}
	}
	return v, nil
}

func (r *campusRepo) Update(_ context.Context, c domain.Campus) (domain.Campus, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.campuses[c.ID]; !ok {
		return domain.Campus{}, store.NotFoundError{Resource: "campus", ID: c.ID}
	}
	out := applyMetaOnUpdate(c.Meta, func(m domain.Meta) domain.Campus { c.Meta = m; return c })
	rs.campuses[out.ID] = out
	return out, nil
}

func (r *campusRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.campuses[id]; !ok {
		return store.NotFoundError{Resource: "campus", ID: id}
	}
	delete(rs.campuses, id)
	return nil
}

func (r *campusRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Campus, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Campus, 0, len(rs.campuses))
	for _, v := range rs.campuses {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// roomRepo

type roomRepo Store

func (r *roomRepo) Create(_ context.Context, rm domain.Room) (domain.Room, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if rm.ID != "" {
		if _, ok := rs.rooms[rm.ID]; ok {
			return domain.Room{}, store.ConflictError{Reason: "room id exists"}
		}
	}
	out := applyMetaOnCreate(rm.Meta, func(m domain.Meta) domain.Room { rm.Meta = m; return rm })
	rs.rooms[out.ID] = out
	return out, nil
}
func (r *roomRepo) Get(_ context.Context, id string) (domain.Room, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.rooms[id]
	if !ok {
		return domain.Room{}, store.NotFoundError{Resource: "room", ID: id}
	}
	return v, nil
}
func (r *roomRepo) Update(_ context.Context, rm domain.Room) (domain.Room, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.rooms[rm.ID]; !ok {
		return domain.Room{}, store.NotFoundError{Resource: "room", ID: rm.ID}
	}
	out := applyMetaOnUpdate(rm.Meta, func(m domain.Meta) domain.Room { rm.Meta = m; return rm })
	rs.rooms[out.ID] = out
	return out, nil
}
func (r *roomRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.rooms[id]; !ok {
		return store.NotFoundError{Resource: "room", ID: id}
	}
	delete(rs.rooms, id)
	return nil
}
func (r *roomRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Room, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Room, 0, len(rs.rooms))
	for _, v := range rs.rooms {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// classRepo

type classRepo Store

func (r *classRepo) Create(_ context.Context, c domain.Class) (domain.Class, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if c.ID != "" {
		if _, ok := rs.classes[c.ID]; ok {
			return domain.Class{}, store.ConflictError{Reason: "class id exists"}
		}
	}
	out := applyMetaOnCreate(c.Meta, func(m domain.Meta) domain.Class { c.Meta = m; return c })
	rs.classes[out.ID] = out
	return out, nil
}
func (r *classRepo) Get(_ context.Context, id string) (domain.Class, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.classes[id]
	if !ok {
		return domain.Class{}, store.NotFoundError{Resource: "class", ID: id}
	}
	return v, nil
}
func (r *classRepo) Update(_ context.Context, c domain.Class) (domain.Class, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.classes[c.ID]; !ok {
		return domain.Class{}, store.NotFoundError{Resource: "class", ID: c.ID}
	}
	out := applyMetaOnUpdate(c.Meta, func(m domain.Meta) domain.Class { c.Meta = m; return c })
	rs.classes[out.ID] = out
	return out, nil
}
func (r *classRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.classes[id]; !ok {
		return store.NotFoundError{Resource: "class", ID: id}
	}
	delete(rs.classes, id)
	return nil
}
func (r *classRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Class, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Class, 0, len(rs.classes))
	for _, v := range rs.classes {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// enrollmentRepo

type enrollmentRepo Store

func (r *enrollmentRepo) Create(_ context.Context, e domain.Enrollment) (domain.Enrollment, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if e.ID != "" {
		if _, ok := rs.enrollments[e.ID]; ok {
			return domain.Enrollment{}, store.ConflictError{Reason: "enrollment id exists"}
		}
	}
	out := applyMetaOnCreate(e.Meta, func(m domain.Meta) domain.Enrollment { e.Meta = m; return e })
	rs.enrollments[out.ID] = out
	return out, nil
}
func (r *enrollmentRepo) Get(_ context.Context, id string) (domain.Enrollment, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.enrollments[id]
	if !ok {
		return domain.Enrollment{}, store.NotFoundError{Resource: "enrollment", ID: id}
	}
	return v, nil
}
func (r *enrollmentRepo) Update(_ context.Context, e domain.Enrollment) (domain.Enrollment, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.enrollments[e.ID]; !ok {
		return domain.Enrollment{}, store.NotFoundError{Resource: "enrollment", ID: e.ID}
	}
	out := applyMetaOnUpdate(e.Meta, func(m domain.Meta) domain.Enrollment { e.Meta = m; return e })
	rs.enrollments[out.ID] = out
	return out, nil
}
func (r *enrollmentRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.enrollments[id]; !ok {
		return store.NotFoundError{Resource: "enrollment", ID: id}
	}
	delete(rs.enrollments, id)
	return nil
}
func (r *enrollmentRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Enrollment, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Enrollment, 0, len(rs.enrollments))
	for _, v := range rs.enrollments {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// eventRepo

type eventRepo Store

func (r *eventRepo) Create(_ context.Context, e domain.Event) (domain.Event, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if e.ID != "" {
		if _, ok := rs.events[e.ID]; ok {
			return domain.Event{}, store.ConflictError{Reason: "event id exists"}
		}
	}
	out := applyMetaOnCreate(e.Meta, func(m domain.Meta) domain.Event { e.Meta = m; return e })
	rs.events[out.ID] = out
	return out, nil
}

func (r *eventRepo) Get(_ context.Context, id string) (domain.Event, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.events[id]
	if !ok {
		return domain.Event{}, store.NotFoundError{Resource: "event", ID: id}
	}
	return v, nil
}

func (r *eventRepo) Update(_ context.Context, e domain.Event) (domain.Event, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.events[e.ID]; !ok {
		return domain.Event{}, store.NotFoundError{Resource: "event", ID: e.ID}
	}
	out := applyMetaOnUpdate(e.Meta, func(m domain.Meta) domain.Event { e.Meta = m; return e })
	rs.events[out.ID] = out
	return out, nil
}

func (r *eventRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.events[id]; !ok {
		return store.NotFoundError{Resource: "event", ID: id}
	}
	delete(rs.events, id)
	return nil
}

func (r *eventRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Event, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Event, 0, len(rs.events))
	for _, v := range rs.events {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// attendanceRepo

type attendanceRepo Store

func (r *attendanceRepo) Create(_ context.Context, a domain.Attendance) (domain.Attendance, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if a.ID != "" {
		if _, ok := rs.attendances[a.ID]; ok {
			return domain.Attendance{}, store.ConflictError{Reason: "attendance id exists"}
		}
	}
	out := applyMetaOnCreate(a.Meta, func(m domain.Meta) domain.Attendance { a.Meta = m; return a })
	rs.attendances[out.ID] = out
	return out, nil
}
func (r *attendanceRepo) Get(_ context.Context, id string) (domain.Attendance, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.attendances[id]
	if !ok {
		return domain.Attendance{}, store.NotFoundError{Resource: "attendance", ID: id}
	}
	return v, nil
}
func (r *attendanceRepo) Update(_ context.Context, a domain.Attendance) (domain.Attendance, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.attendances[a.ID]; !ok {
		return domain.Attendance{}, store.NotFoundError{Resource: "attendance", ID: a.ID}
	}
	out := applyMetaOnUpdate(a.Meta, func(m domain.Meta) domain.Attendance { a.Meta = m; return a })
	rs.attendances[out.ID] = out
	return out, nil
}
func (r *attendanceRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.attendances[id]; !ok {
		return store.NotFoundError{Resource: "attendance", ID: id}
	}
	delete(rs.attendances, id)
	return nil
}
func (r *attendanceRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Attendance, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Attendance, 0, len(rs.attendances))
	for _, v := range rs.attendances {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// assessmentRepo

type assessmentRepo Store

func (r *assessmentRepo) Create(_ context.Context, a domain.Assessment) (domain.Assessment, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if a.ID != "" {
		if _, ok := rs.assessments[a.ID]; ok {
			return domain.Assessment{}, store.ConflictError{Reason: "assessment id exists"}
		}
	}
	out := applyMetaOnCreate(a.Meta, func(m domain.Meta) domain.Assessment { a.Meta = m; return a })
	rs.assessments[out.ID] = out
	return out, nil
}

func (r *assessmentRepo) Get(_ context.Context, id string) (domain.Assessment, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.assessments[id]
	if !ok {
		return domain.Assessment{}, store.NotFoundError{Resource: "assessment", ID: id}
	}
	return v, nil
}

func (r *assessmentRepo) Update(_ context.Context, a domain.Assessment) (domain.Assessment, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.assessments[a.ID]; !ok {
		return domain.Assessment{}, store.NotFoundError{Resource: "assessment", ID: a.ID}
	}
	out := applyMetaOnUpdate(a.Meta, func(m domain.Meta) domain.Assessment { a.Meta = m; return a })
	rs.assessments[out.ID] = out
	return out, nil
}

func (r *assessmentRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.assessments[id]; !ok {
		return store.NotFoundError{Resource: "assessment", ID: id}
	}
	delete(rs.assessments, id)
	return nil
}

func (r *assessmentRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Assessment, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Assessment, 0, len(rs.assessments))
	for _, v := range rs.assessments {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// scoreRepo

type scoreRepo Store

func (r *scoreRepo) Create(_ context.Context, s domain.Score) (domain.Score, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if s.ID != "" {
		if _, ok := rs.scores[s.ID]; ok {
			return domain.Score{}, store.ConflictError{Reason: "score id exists"}
		}
	}
	out := applyMetaOnCreate(s.Meta, func(m domain.Meta) domain.Score { s.Meta = m; return s })
	rs.scores[out.ID] = out
	return out, nil
}

func (r *scoreRepo) Get(_ context.Context, id string) (domain.Score, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.scores[id]
	if !ok {
		return domain.Score{}, store.NotFoundError{Resource: "score", ID: id}
	}
	return v, nil
}

func (r *scoreRepo) Update(_ context.Context, s domain.Score) (domain.Score, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.scores[s.ID]; !ok {
		return domain.Score{}, store.NotFoundError{Resource: "score", ID: s.ID}
	}
	out := applyMetaOnUpdate(s.Meta, func(m domain.Meta) domain.Score { s.Meta = m; return s })
	rs.scores[out.ID] = out
	return out, nil
}

func (r *scoreRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.scores[id]; !ok {
		return store.NotFoundError{Resource: "score", ID: id}
	}
	delete(rs.scores, id)
	return nil
}

func (r *scoreRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Score, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Score, 0, len(rs.scores))
	for _, v := range rs.scores {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// eventRegistrationRepo

type eventRegistrationRepo Store

func (r *eventRegistrationRepo) Create(_ context.Context, rec domain.EventRegistration) (domain.EventRegistration, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if rec.ID != "" {
		if _, ok := rs.registrations[rec.ID]; ok {
			return domain.EventRegistration{}, store.ConflictError{Reason: "registration id exists"}
		}
	}
	out := applyMetaOnCreate(rec.Meta, func(m domain.Meta) domain.EventRegistration { rec.Meta = m; return rec })
	rs.registrations[out.ID] = out
	return out, nil
}
func (r *eventRegistrationRepo) Get(_ context.Context, id string) (domain.EventRegistration, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.registrations[id]
	if !ok {
		return domain.EventRegistration{}, store.NotFoundError{Resource: "eventRegistration", ID: id}
	}
	return v, nil
}
func (r *eventRegistrationRepo) Update(_ context.Context, rec domain.EventRegistration) (domain.EventRegistration, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.registrations[rec.ID]; !ok {
		return domain.EventRegistration{}, store.NotFoundError{Resource: "eventRegistration", ID: rec.ID}
	}
	out := applyMetaOnUpdate(rec.Meta, func(m domain.Meta) domain.EventRegistration { rec.Meta = m; return rec })
	rs.registrations[out.ID] = out
	return out, nil
}
func (r *eventRegistrationRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.registrations[id]; !ok {
		return store.NotFoundError{Resource: "eventRegistration", ID: id}
	}
	delete(rs.registrations, id)
	return nil
}
func (r *eventRegistrationRepo) List(_ context.Context, opts store.ListOptions) ([]domain.EventRegistration, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.EventRegistration, 0, len(rs.registrations))
	for _, v := range rs.registrations {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// announcementRepo

type announcementRepo Store

func (r *announcementRepo) Create(_ context.Context, a domain.Announcement) (domain.Announcement, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if a.ID != "" {
		if _, ok := rs.announcements[a.ID]; ok {
			return domain.Announcement{}, store.ConflictError{Reason: "announcement id exists"}
		}
	}
	out := applyMetaOnCreate(a.Meta, func(m domain.Meta) domain.Announcement { a.Meta = m; return a })
	rs.announcements[out.ID] = out
	return out, nil
}

func (r *announcementRepo) Get(_ context.Context, id string) (domain.Announcement, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	v, ok := rs.announcements[id]
	if !ok {
		return domain.Announcement{}, store.NotFoundError{Resource: "announcement", ID: id}
	}
	return v, nil
}

func (r *announcementRepo) Update(_ context.Context, a domain.Announcement) (domain.Announcement, error) {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.announcements[a.ID]; !ok {
		return domain.Announcement{}, store.NotFoundError{Resource: "announcement", ID: a.ID}
	}
	out := applyMetaOnUpdate(a.Meta, func(m domain.Meta) domain.Announcement { a.Meta = m; return a })
	rs.announcements[out.ID] = out
	return out, nil
}

func (r *announcementRepo) Delete(_ context.Context, id string) error {
	rs := (*Store)(r)
	rs.Lock()
	defer rs.Unlock()
	if _, ok := rs.announcements[id]; !ok {
		return store.NotFoundError{Resource: "announcement", ID: id}
	}
	delete(rs.announcements, id)
	return nil
}

func (r *announcementRepo) List(_ context.Context, opts store.ListOptions) ([]domain.Announcement, int, error) {
	rs := (*Store)(r)
	rs.RLock()
	defer rs.RUnlock()
	arr := make([]domain.Announcement, 0, len(rs.announcements))
	for _, v := range rs.announcements {
		arr = append(arr, v)
	}
	total := len(arr)
	arr = sortAndPage(arr, opts, func(i int) time.Time { return arr[i].CreatedAt }, func(i int) time.Time { return arr[i].UpdatedAt })
	return arr, total, nil
}

// Exported wrappers used by HTTP layer for convenience when running with in-memory store.
func (s *Store) ApplyEventRegistration(ctx context.Context, eventID, studentID string) (domain.EventRegistration, error) {
	return s.applyEventRegistration(ctx, eventID, studentID)
}

func (s *Store) CancelEventRegistrationAndPromote(ctx context.Context, id string) (domain.EventRegistration, *domain.EventRegistration, error) {
	return s.cancelEventRegistrationAndPromote(ctx, id)
}
