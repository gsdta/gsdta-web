package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type eventRegRepo Store

func (r *eventRegRepo) Create(ctx context.Context, in domain.EventRegistration) (domain.EventRegistration, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO event_registrations (event_id, student_id, status) VALUES ($1,$2,$3) RETURNING id, created_at, updated_at`, in.EventID, in.StudentID, in.Status)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.EventRegistration{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *eventRegRepo) Get(ctx context.Context, id string) (domain.EventRegistration, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, event_id, student_id, status, created_at, updated_at FROM event_registrations WHERE id=$1`, id)
	var out domain.EventRegistration
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.EventID, &out.StudentID, &out.Status, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.EventRegistration{}, notFound("eventRegistration", id)
		}
		return domain.EventRegistration{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	return out, nil
}
func (r *eventRegRepo) Update(ctx context.Context, in domain.EventRegistration) (domain.EventRegistration, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE event_registrations SET event_id=$1, student_id=$2, status=$3, updated_at=now() WHERE id=$4 RETURNING created_at, updated_at`, in.EventID, in.StudentID, in.Status, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.EventRegistration{}, notFound("eventRegistration", in.ID)
		}
		return domain.EventRegistration{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *eventRegRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM event_registrations WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("eventRegistration", id)
	}
	return nil
}
func (r *eventRegRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.EventRegistration, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM event_registrations`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, event_id, student_id, status, created_at, updated_at FROM event_registrations `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.EventRegistration
	for rows.Next() {
		var er domain.EventRegistration
		var created, updated sql.NullTime
		if err := rows.Scan(&er.ID, &er.EventID, &er.StudentID, &er.Status, &created, &updated); err != nil {
			return nil, 0, err
		}
		er.Meta = scanMeta(created.Time, updated.Time, er.ID)
		out = append(out, er)
	}
	return out, total, rows.Err()
}
