package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type termRepo Store

func (r *termRepo) Create(ctx context.Context, t domain.Term) (domain.Term, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO terms (name, start_date, end_date) VALUES ($1,$2,$3) RETURNING id, created_at, updated_at`, t.Name, t.StartDate, t.EndDate)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Term{}, err
	}
	t.Meta = scanMeta(created.Time, updated.Time, id)
	return t, nil
}

func (r *termRepo) Get(ctx context.Context, id string) (domain.Term, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, name, start_date, end_date, created_at, updated_at FROM terms WHERE id=$1`, id)
	var t domain.Term
	var created, updated sql.NullTime
	if err := row.Scan(&t.ID, &t.Name, &t.StartDate, &t.EndDate, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Term{}, notFound("term", id)
		}
		return domain.Term{}, err
	}
	t.Meta = scanMeta(created.Time, updated.Time, t.ID)
	return t, nil
}

func (r *termRepo) Update(ctx context.Context, t domain.Term) (domain.Term, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE terms SET name=$1, start_date=$2, end_date=$3, updated_at=now() WHERE id=$4 RETURNING created_at, updated_at`, t.Name, t.StartDate, t.EndDate, t.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Term{}, notFound("term", t.ID)
		}
		return domain.Term{}, err
	}
	t.Meta = scanMeta(created.Time, updated.Time, t.ID)
	return t, nil
}

func (r *termRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM terms WHERE id=$1`, id)
	if err != nil {
		return err
	}
	a, _ := res.RowsAffected()
	if a == 0 {
		return notFound("term", id)
	}
	return nil
}

func (r *termRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Term, int, error) {
	s := (*Store)(r)
	// total
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM terms`).Scan(&total); err != nil {
		return nil, 0, err
	}
	q := `SELECT id, name, start_date, end_date, created_at, updated_at FROM terms ` + orderBy(opts) + ` ` + page(opts)
	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Term
	for rows.Next() {
		var t domain.Term
		var created, updated sql.NullTime
		if err := rows.Scan(&t.ID, &t.Name, &t.StartDate, &t.EndDate, &created, &updated); err != nil {
			return nil, 0, err
		}
		t.Meta = scanMeta(created.Time, updated.Time, t.ID)
		out = append(out, t)
	}
	return out, total, rows.Err()
}
