package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type scoreRepo Store

func (r *scoreRepo) Create(ctx context.Context, in domain.Score) (domain.Score, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO scores (assessment_id, student_id, value) VALUES ($1,$2,$3) RETURNING id, created_at, updated_at`, in.AssessmentID, in.StudentID, in.Value)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Score{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *scoreRepo) Get(ctx context.Context, id string) (domain.Score, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, assessment_id, student_id, value, created_at, updated_at FROM scores WHERE id=$1`, id)
	var out domain.Score
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.AssessmentID, &out.StudentID, &out.Value, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Score{}, notFound("score", id)
		}
		return domain.Score{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	return out, nil
}
func (r *scoreRepo) Update(ctx context.Context, in domain.Score) (domain.Score, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE scores SET assessment_id=$1, student_id=$2, value=$3, updated_at=now() WHERE id=$4 RETURNING created_at, updated_at`, in.AssessmentID, in.StudentID, in.Value, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Score{}, notFound("score", in.ID)
		}
		return domain.Score{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *scoreRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM scores WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("score", id)
	}
	return nil
}
func (r *scoreRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Score, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM scores`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, assessment_id, student_id, value, created_at, updated_at FROM scores `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Score
	for rows.Next() {
		var s2 domain.Score
		var created, updated sql.NullTime
		if err := rows.Scan(&s2.ID, &s2.AssessmentID, &s2.StudentID, &s2.Value, &created, &updated); err != nil {
			return nil, 0, err
		}
		s2.Meta = scanMeta(created.Time, updated.Time, s2.ID)
		out = append(out, s2)
	}
	return out, total, rows.Err()
}
