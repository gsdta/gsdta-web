package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type roomRepo Store

func (r *roomRepo) Create(ctx context.Context, in domain.Room) (domain.Room, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO rooms (campus_id, name, capacity) VALUES ($1,$2,$3) RETURNING id, created_at, updated_at`, in.CampusID, in.Name, in.Capacity)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Room{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *roomRepo) Get(ctx context.Context, id string) (domain.Room, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, campus_id, name, capacity, created_at, updated_at FROM rooms WHERE id=$1`, id)
	var out domain.Room
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.CampusID, &out.Name, &out.Capacity, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Room{}, notFound("room", id)
		}
		return domain.Room{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	return out, nil
}
func (r *roomRepo) Update(ctx context.Context, in domain.Room) (domain.Room, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE rooms SET campus_id=$1, name=$2, capacity=$3, updated_at=now() WHERE id=$4 RETURNING created_at, updated_at`, in.CampusID, in.Name, in.Capacity, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Room{}, notFound("room", in.ID)
		}
		return domain.Room{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *roomRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM rooms WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("room", id)
	}
	return nil
}
func (r *roomRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Room, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM rooms`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id,campus_id,name,capacity,created_at,updated_at FROM rooms `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Room
	for rows.Next() {
		var rm domain.Room
		var created, updated sql.NullTime
		if err := rows.Scan(&rm.ID, &rm.CampusID, &rm.Name, &rm.Capacity, &created, &updated); err != nil {
			return nil, 0, err
		}
		rm.Meta = scanMeta(created.Time, updated.Time, rm.ID)
		out = append(out, rm)
	}
	return out, total, rows.Err()
}
