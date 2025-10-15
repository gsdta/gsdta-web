package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type announcementRepo Store

func (r *announcementRepo) Create(ctx context.Context, in domain.Announcement) (domain.Announcement, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO announcements (scope, class_id, title, body, publish_at) VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at, updated_at`, in.Scope, in.ClassID, in.Title, in.Body, in.PublishAt)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Announcement{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *announcementRepo) Get(ctx context.Context, id string) (domain.Announcement, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, scope, class_id, title, body, publish_at, created_at, updated_at FROM announcements WHERE id=$1`, id)
	var out domain.Announcement
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.Scope, &out.ClassID, &out.Title, &out.Body, &out.PublishAt, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Announcement{}, notFound("announcement", id)
		}
		return domain.Announcement{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	return out, nil
}
func (r *announcementRepo) Update(ctx context.Context, in domain.Announcement) (domain.Announcement, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE announcements SET scope=$1, class_id=$2, title=$3, body=$4, publish_at=$5, updated_at=now() WHERE id=$6 RETURNING created_at, updated_at`, in.Scope, in.ClassID, in.Title, in.Body, in.PublishAt, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Announcement{}, notFound("announcement", in.ID)
		}
		return domain.Announcement{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *announcementRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM announcements WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("announcement", id)
	}
	return nil
}
func (r *announcementRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Announcement, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM announcements`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, scope, class_id, title, body, publish_at, created_at, updated_at FROM announcements `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Announcement
	for rows.Next() {
		var a domain.Announcement
		var created, updated sql.NullTime
		if err := rows.Scan(&a.ID, &a.Scope, &a.ClassID, &a.Title, &a.Body, &a.PublishAt, &created, &updated); err != nil {
			return nil, 0, err
		}
		a.Meta = scanMeta(created.Time, updated.Time, a.ID)
		out = append(out, a)
	}
	return out, total, rows.Err()
}
