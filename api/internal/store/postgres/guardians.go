package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type guardianRepo Store

func (r *guardianRepo) Create(ctx context.Context, g domain.Guardian) (domain.Guardian, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO guardians (user_id, phone) VALUES ($1,$2) RETURNING id, created_at, updated_at`, g.UserID, g.Phone)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Guardian{}, err
	}
	g.Meta = scanMeta(created.Time, updated.Time, id)
	return g, nil
}
func (r *guardianRepo) Get(ctx context.Context, id string) (domain.Guardian, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, user_id, phone, created_at, updated_at FROM guardians WHERE id=$1`, id)
	var g domain.Guardian
	var created, updated sql.NullTime
	if err := row.Scan(&g.ID, &g.UserID, &g.Phone, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Guardian{}, notFound("guardian", id)
		}
		return domain.Guardian{}, err
	}
	g.Meta = scanMeta(created.Time, updated.Time, g.ID)
	return g, nil
}
func (r *guardianRepo) Update(ctx context.Context, g domain.Guardian) (domain.Guardian, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE guardians SET user_id=$1, phone=$2, updated_at=now() WHERE id=$3 RETURNING created_at, updated_at`, g.UserID, g.Phone, g.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Guardian{}, notFound("guardian", g.ID)
		}
		return domain.Guardian{}, err
	}
	g.Meta = scanMeta(created.Time, updated.Time, g.ID)
	return g, nil
}
func (r *guardianRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM guardians WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("guardian", id)
	}
	return nil
}
func (r *guardianRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Guardian, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM guardians`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, user_id, phone, created_at, updated_at FROM guardians `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Guardian
	for rows.Next() {
		var g domain.Guardian
		var created, updated sql.NullTime
		if err := rows.Scan(&g.ID, &g.UserID, &g.Phone, &created, &updated); err != nil {
			return nil, 0, err
		}
		g.Meta = scanMeta(created.Time, updated.Time, g.ID)
		out = append(out, g)
	}
	return out, total, rows.Err()
}
