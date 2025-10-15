package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type campusRepo Store

func (r *campusRepo) Create(ctx context.Context, c domain.Campus) (domain.Campus, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO campuses (name) VALUES ($1) RETURNING id, created_at, updated_at`, c.Name)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Campus{}, err
	}
	c.Meta = scanMeta(created.Time, updated.Time, id)
	return c, nil
}
func (r *campusRepo) Get(ctx context.Context, id string) (domain.Campus, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id,name,created_at,updated_at FROM campuses WHERE id=$1`, id)
	var c domain.Campus
	var created, updated sql.NullTime
	if err := row.Scan(&c.ID, &c.Name, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Campus{}, notFound("campus", id)
		}
		return domain.Campus{}, err
	}
	c.Meta = scanMeta(created.Time, updated.Time, c.ID)
	return c, nil
}
func (r *campusRepo) Update(ctx context.Context, c domain.Campus) (domain.Campus, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE campuses SET name=$1, updated_at=now() WHERE id=$2 RETURNING created_at, updated_at`, c.Name, c.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Campus{}, notFound("campus", c.ID)
		}
		return domain.Campus{}, err
	}
	c.Meta = scanMeta(created.Time, updated.Time, c.ID)
	return c, nil
}
func (r *campusRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM campuses WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("campus", id)
	}
	return nil
}
func (r *campusRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Campus, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM campuses`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id,name,created_at,updated_at FROM campuses `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := make([]domain.Campus, 0)
	for rows.Next() {
		var c domain.Campus
		var created, updated sql.NullTime
		if err := rows.Scan(&c.ID, &c.Name, &created, &updated); err != nil {
			return nil, 0, err
		}
		c.Meta = scanMeta(created.Time, updated.Time, c.ID)
		out = append(out, c)
	}
	return out, total, rows.Err()
}
