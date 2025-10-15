package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

// Store implements store.Accessor backed by PostgreSQL.
type Store struct {
	db *sql.DB
}

func New(db *sql.DB) *Store { return &Store{db: db} }

// Migrate applies the provided SQL schema (idempotent if schema contains IF NOT EXISTS guards).
func (s *Store) Migrate(ctx context.Context, sqlText string) error {
	if strings.TrimSpace(sqlText) == "" {
		return nil
	}
	_, err := s.db.ExecContext(ctx, sqlText)
	return err
}

// Helpers
func orderBy(opts store.ListOptions) string {
	sortBy := "created_at"
	switch opts.SortBy {
	case "updatedAt":
		sortBy = "updated_at"
	}
	ord := "ASC"
	if opts.Desc {
		ord = "DESC"
	}
	return fmt.Sprintf("ORDER BY %s %s", sortBy, ord)
}

func page(opts store.ListOptions) string {
	if opts.Limit <= 0 {
		return ""
	}
	return fmt.Sprintf("LIMIT %d OFFSET %d", opts.Limit, opts.Offset)
}

// Accessor implementation
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
func (s *Store) EventRegistrations() store.EventRegistrationRepo { return (*eventRegRepo)(s) }
func (s *Store) Announcements() store.AnnouncementRepo           { return (*announcementRepo)(s) }

// Shared scans
func scanMeta(created, updated time.Time, id string) domain.Meta {
	return domain.Meta{ID: id, CreatedAt: created.UTC(), UpdatedAt: updated.UTC()}
}

// Error helpers
func notFound(resource, id string) error { return store.NotFoundError{Resource: resource, ID: id} }
func isNoRows(err error) bool            { return errors.Is(err, sql.ErrNoRows) }
