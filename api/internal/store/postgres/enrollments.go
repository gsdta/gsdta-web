package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type enrollmentRepo Store

func (r *enrollmentRepo) Create(ctx context.Context, in domain.Enrollment) (domain.Enrollment, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO enrollments (student_id, class_id, status) VALUES ($1,$2,$3) RETURNING id, created_at, updated_at`, in.StudentID, in.ClassID, in.Status)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Enrollment{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *enrollmentRepo) Get(ctx context.Context, id string) (domain.Enrollment, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, student_id, class_id, status, created_at, updated_at FROM enrollments WHERE id=$1`, id)
	var out domain.Enrollment
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.StudentID, &out.ClassID, &out.Status, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Enrollment{}, notFound("enrollment", id)
		}
		return domain.Enrollment{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	return out, nil
}
func (r *enrollmentRepo) Update(ctx context.Context, in domain.Enrollment) (domain.Enrollment, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE enrollments SET student_id=$1, class_id=$2, status=$3, updated_at=now() WHERE id=$4 RETURNING created_at, updated_at`, in.StudentID, in.ClassID, in.Status, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Enrollment{}, notFound("enrollment", in.ID)
		}
		return domain.Enrollment{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *enrollmentRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM enrollments WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("enrollment", id)
	}
	return nil
}
func (r *enrollmentRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Enrollment, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM enrollments`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, student_id, class_id, status, created_at, updated_at FROM enrollments `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Enrollment
	for rows.Next() {
		var e domain.Enrollment
		var created, updated sql.NullTime
		if err := rows.Scan(&e.ID, &e.StudentID, &e.ClassID, &e.Status, &created, &updated); err != nil {
			return nil, 0, err
		}
		e.Meta = scanMeta(created.Time, updated.Time, e.ID)
		out = append(out, e)
	}
	return out, total, rows.Err()
}
