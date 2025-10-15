package store

import (
	"context"

	"github.com/gsdta/api/internal/domain"
)

// ListOptions supports basic pagination and sorting.
type ListOptions struct {
	Limit  int    // max items to return (0=all)
	Offset int    // number of items to skip
	SortBy string // "createdAt" | "updatedAt"
	Desc   bool   // descending if true
}

// StudentRepo data access for students.
type StudentRepo interface {
	Create(ctx context.Context, s domain.Student) (domain.Student, error)
	Get(ctx context.Context, id string) (domain.Student, error)
	Update(ctx context.Context, s domain.Student) (domain.Student, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Student, int, error)
}

// GuardianRepo data access for guardians.
type GuardianRepo interface {
	Create(ctx context.Context, g domain.Guardian) (domain.Guardian, error)
	Get(ctx context.Context, id string) (domain.Guardian, error)
	Update(ctx context.Context, g domain.Guardian) (domain.Guardian, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Guardian, int, error)
}

// TermRepo data access for terms.
type TermRepo interface {
	Create(ctx context.Context, t domain.Term) (domain.Term, error)
	Get(ctx context.Context, id string) (domain.Term, error)
	Update(ctx context.Context, t domain.Term) (domain.Term, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Term, int, error)
}

// CampusRepo data access for campuses.
type CampusRepo interface {
	Create(ctx context.Context, c domain.Campus) (domain.Campus, error)
	Get(ctx context.Context, id string) (domain.Campus, error)
	Update(ctx context.Context, c domain.Campus) (domain.Campus, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Campus, int, error)
}

// RoomRepo data access for rooms.
type RoomRepo interface {
	Create(ctx context.Context, r domain.Room) (domain.Room, error)
	Get(ctx context.Context, id string) (domain.Room, error)
	Update(ctx context.Context, r domain.Room) (domain.Room, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Room, int, error)
}

// ClassRepo data access for classes.
type ClassRepo interface {
	Create(ctx context.Context, c domain.Class) (domain.Class, error)
	Get(ctx context.Context, id string) (domain.Class, error)
	Update(ctx context.Context, c domain.Class) (domain.Class, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Class, int, error)
}

// EnrollmentRepo data access for enrollments.
type EnrollmentRepo interface {
	Create(ctx context.Context, e domain.Enrollment) (domain.Enrollment, error)
	Get(ctx context.Context, id string) (domain.Enrollment, error)
	Update(ctx context.Context, e domain.Enrollment) (domain.Enrollment, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Enrollment, int, error)
}

// EventRepo for events.
type EventRepo interface {
	Create(ctx context.Context, e domain.Event) (domain.Event, error)
	Get(ctx context.Context, id string) (domain.Event, error)
	Update(ctx context.Context, e domain.Event) (domain.Event, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Event, int, error)
}

// AttendanceRepo for class attendance sheets.
type AttendanceRepo interface {
	Create(ctx context.Context, a domain.Attendance) (domain.Attendance, error)
	Get(ctx context.Context, id string) (domain.Attendance, error)
	Update(ctx context.Context, a domain.Attendance) (domain.Attendance, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Attendance, int, error)
}

// AssessmentRepo for assessments.
type AssessmentRepo interface {
	Create(ctx context.Context, a domain.Assessment) (domain.Assessment, error)
	Get(ctx context.Context, id string) (domain.Assessment, error)
	Update(ctx context.Context, a domain.Assessment) (domain.Assessment, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Assessment, int, error)
}

// ScoreRepo for assessment scores.
type ScoreRepo interface {
	Create(ctx context.Context, s domain.Score) (domain.Score, error)
	Get(ctx context.Context, id string) (domain.Score, error)
	Update(ctx context.Context, s domain.Score) (domain.Score, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Score, int, error)
}

// EventRegistrationRepo for event registrations.
type EventRegistrationRepo interface {
	Create(ctx context.Context, r domain.EventRegistration) (domain.EventRegistration, error)
	Get(ctx context.Context, id string) (domain.EventRegistration, error)
	Update(ctx context.Context, r domain.EventRegistration) (domain.EventRegistration, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.EventRegistration, int, error)
}

// AnnouncementRepo for announcements.
type AnnouncementRepo interface {
	Create(ctx context.Context, a domain.Announcement) (domain.Announcement, error)
	Get(ctx context.Context, id string) (domain.Announcement, error)
	Update(ctx context.Context, a domain.Announcement) (domain.Announcement, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, opts ListOptions) ([]domain.Announcement, int, error)
}

// Accessor aggregates access to repositories; implemented by concrete stores.
type Accessor interface {
	Students() StudentRepo
	Guardians() GuardianRepo
	Terms() TermRepo
	Campuses() CampusRepo
	Rooms() RoomRepo
	Classes() ClassRepo
	Enrollments() EnrollmentRepo
	Events() EventRepo
	Attendances() AttendanceRepo
	Assessments() AssessmentRepo
	Scores() ScoreRepo
	EventRegistrations() EventRegistrationRepo
	Announcements() AnnouncementRepo
}
