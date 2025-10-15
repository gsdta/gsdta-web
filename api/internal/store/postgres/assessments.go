package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type assessmentRepo Store

func (r *assessmentRepo) Create(ctx context.Context, in domain.Assessment) (domain.Assessment, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO assessments (class_id, title, date, level, max_score) VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at, updated_at`, in.ClassID, in.Title, in.Date, in.Level, in.MaxScore)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Assessment{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *assessmentRepo) Get(ctx context.Context, id string) (domain.Assessment, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, class_id, title, date, level, max_score, created_at, updated_at FROM assessments WHERE id=$1`, id)
	var out domain.Assessment
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.ClassID, &out.Title, &out.Date, &out.Level, &out.MaxScore, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Assessment{}, notFound("assessment", id)
		}
		return domain.Assessment{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	return out, nil
}
func (r *assessmentRepo) Update(ctx context.Context, in domain.Assessment) (domain.Assessment, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE assessments SET class_id=$1, title=$2, date=$3, level=$4, max_score=$5, updated_at=now() WHERE id=$6 RETURNING created_at, updated_at`, in.ClassID, in.Title, in.Date, in.Level, in.MaxScore, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Assessment{}, notFound("assessment", in.ID)
		}
		return domain.Assessment{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *assessmentRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM assessments WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("assessment", id)
	}
	return nil
}
func (r *assessmentRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Assessment, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM assessments`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, class_id, title, date, level, max_score, created_at, updated_at FROM assessments `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Assessment
	for rows.Next() {
		var a domain.Assessment
		var created, updated sql.NullTime
		if err := rows.Scan(&a.ID, &a.ClassID, &a.Title, &a.Date, &a.Level, &a.MaxScore, &created, &updated); err != nil {
			return nil, 0, err
		}
		a.Meta = scanMeta(created.Time, updated.Time, a.ID)
		out = append(out, a)
	}
	return out, total, rows.Err()
}
