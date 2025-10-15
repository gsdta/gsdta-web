package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type attendanceRepo Store

func (r *attendanceRepo) Create(ctx context.Context, in domain.Attendance) (domain.Attendance, error) {
	s := (*Store)(r)
	// Create sheet
	row := s.db.QueryRowContext(ctx, `INSERT INTO attendance (class_id, date) VALUES ($1,$2) RETURNING id, created_at, updated_at`, in.ClassID, in.Date)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Attendance{}, err
	}
	in.ID = id
	in.Meta = scanMeta(created.Time, updated.Time, id)
	// Insert records
	if len(in.Records) > 0 {
		for _, rec := range in.Records {
			if _, err := s.db.ExecContext(ctx, `INSERT INTO attendance_records (attendance_id, student_id, status, at) VALUES ($1,$2,$3,$4) ON CONFLICT (attendance_id, student_id) DO UPDATE SET status=EXCLUDED.status, at=EXCLUDED.at`, id, rec.StudentID, rec.Status, rec.At); err != nil {
				return domain.Attendance{}, err
			}
		}
	}
	return in, nil
}

func (r *attendanceRepo) Get(ctx context.Context, id string) (domain.Attendance, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, class_id, date, created_at, updated_at FROM attendance WHERE id=$1`, id)
	var out domain.Attendance
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.ClassID, &out.Date, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Attendance{}, notFound("attendance", id)
		}
		return domain.Attendance{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	// Load records
	rows, err := s.db.QueryContext(ctx, `SELECT student_id, status, at FROM attendance_records WHERE attendance_id=$1`, id)
	if err != nil {
		return domain.Attendance{}, err
	}
	defer rows.Close()
	recs := make([]domain.AttendanceRecord, 0)
	for rows.Next() {
		var ar domain.AttendanceRecord
		if err := rows.Scan(&ar.StudentID, &ar.Status, &ar.At); err != nil {
			return domain.Attendance{}, err
		}
		recs = append(recs, ar)
	}
	out.Records = recs
	return out, rows.Err()
}

func (r *attendanceRepo) Update(ctx context.Context, in domain.Attendance) (domain.Attendance, error) {
	s := (*Store)(r)
	// ensure exists
	_, err := r.Get(ctx, in.ID)
	if err != nil {
		return domain.Attendance{}, err
	}
	// Upsert records (replace)
	if _, err := s.db.ExecContext(ctx, `DELETE FROM attendance_records WHERE attendance_id=$1`, in.ID); err != nil {
		return domain.Attendance{}, err
	}
	for _, rec := range in.Records {
		if _, err := s.db.ExecContext(ctx, `INSERT INTO attendance_records (attendance_id, student_id, status, at) VALUES ($1,$2,$3,$4)`, in.ID, rec.StudentID, rec.Status, rec.At); err != nil {
			return domain.Attendance{}, err
		}
	}
	// touch parent
	row := s.db.QueryRowContext(ctx, `UPDATE attendance SET updated_at=now() WHERE id=$1 RETURNING class_id, date, created_at, updated_at`, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&in.ClassID, &in.Date, &created, &updated); err != nil {
		return domain.Attendance{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}

func (r *attendanceRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM attendance WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("attendance", id)
	}
	return nil
}

func (r *attendanceRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Attendance, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM attendance`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, class_id, date, created_at, updated_at FROM attendance `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Attendance
	for rows.Next() {
		var a domain.Attendance
		var created, updated sql.NullTime
		if err := rows.Scan(&a.ID, &a.ClassID, &a.Date, &created, &updated); err != nil {
			return nil, 0, err
		}
		a.Meta = scanMeta(created.Time, updated.Time, a.ID)
		// skip loading records to keep List lightweight
		out = append(out, a)
	}
	return out, total, rows.Err()
}
