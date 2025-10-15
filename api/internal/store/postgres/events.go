package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type eventRepo Store

func (r *eventRepo) Create(ctx context.Context, in domain.Event) (domain.Event, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO events (title, start_ts, end_ts, location, capacity, eligibility_level) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at, updated_at`, in.Title, in.Start, in.End, in.Location, in.Capacity, in.EligibilityLevel)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Event{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *eventRepo) Get(ctx context.Context, id string) (domain.Event, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, title, start_ts, end_ts, location, capacity, eligibility_level, created_at, updated_at FROM events WHERE id=$1`, id)
	var out domain.Event
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.Title, &out.Start, &out.End, &out.Location, &out.Capacity, &out.EligibilityLevel, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Event{}, notFound("event", id)
		}
		return domain.Event{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	return out, nil
}
func (r *eventRepo) Update(ctx context.Context, in domain.Event) (domain.Event, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE events SET title=$1, start_ts=$2, end_ts=$3, location=$4, capacity=$5, eligibility_level=$6, updated_at=now() WHERE id=$7 RETURNING created_at, updated_at`, in.Title, in.Start, in.End, in.Location, in.Capacity, in.EligibilityLevel, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Event{}, notFound("event", in.ID)
		}
		return domain.Event{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *eventRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM events WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("event", id)
	}
	return nil
}
func (r *eventRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Event, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM events`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, title, start_ts, end_ts, location, capacity, eligibility_level, created_at, updated_at FROM events `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Event
	for rows.Next() {
		var e domain.Event
		var created, updated sql.NullTime
		if err := rows.Scan(&e.ID, &e.Title, &e.Start, &e.End, &e.Location, &e.Capacity, &e.EligibilityLevel, &created, &updated); err != nil {
			return nil, 0, err
		}
		e.Meta = scanMeta(created.Time, updated.Time, e.ID)
		out = append(out, e)
	}
	return out, total, rows.Err()
}
