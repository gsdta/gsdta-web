package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type classRepo Store

func (r *classRepo) Create(ctx context.Context, in domain.Class) (domain.Class, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO classes (term_id,campus_id,room_id,teacher_id,level,weekday,start_hhmm,end_hhmm,capacity,playlist_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id,created_at,updated_at`,
		in.TermID, in.CampusID, in.RoomID, in.TeacherID, in.Level, in.Weekday, in.StartHHMM, in.EndHHMM, in.Capacity, in.PlaylistID)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Class{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *classRepo) Get(ctx context.Context, id string) (domain.Class, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id,term_id,campus_id,room_id,teacher_id,level,weekday,start_hhmm,end_hhmm,capacity,playlist_id,created_at,updated_at FROM classes WHERE id=$1`, id)
	var c domain.Class
	var created, updated sql.NullTime
	if err := row.Scan(&c.ID, &c.TermID, &c.CampusID, &c.RoomID, &c.TeacherID, &c.Level, &c.Weekday, &c.StartHHMM, &c.EndHHMM, &c.Capacity, &c.PlaylistID, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Class{}, notFound("class", id)
		}
		return domain.Class{}, err
	}
	c.Meta = scanMeta(created.Time, updated.Time, c.ID)
	return c, nil
}
func (r *classRepo) Update(ctx context.Context, in domain.Class) (domain.Class, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE classes SET term_id=$1,campus_id=$2,room_id=$3,teacher_id=$4,level=$5,weekday=$6,start_hhmm=$7,end_hhmm=$8,capacity=$9,playlist_id=$10,updated_at=now() WHERE id=$11 RETURNING created_at,updated_at`,
		in.TermID, in.CampusID, in.RoomID, in.TeacherID, in.Level, in.Weekday, in.StartHHMM, in.EndHHMM, in.Capacity, in.PlaylistID, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Class{}, notFound("class", in.ID)
		}
		return domain.Class{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *classRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM classes WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("class", id)
	}
	return nil
}
func (r *classRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Class, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM classes`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id,term_id,campus_id,room_id,teacher_id,level,weekday,start_hhmm,end_hhmm,capacity,playlist_id,created_at,updated_at FROM classes `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := make([]domain.Class, 0)
	for rows.Next() {
		var c domain.Class
		var created, updated sql.NullTime
		if err := rows.Scan(&c.ID, &c.TermID, &c.CampusID, &c.RoomID, &c.TeacherID, &c.Level, &c.Weekday, &c.StartHHMM, &c.EndHHMM, &c.Capacity, &c.PlaylistID, &created, &updated); err != nil {
			return nil, 0, err
		}
		c.Meta = scanMeta(created.Time, updated.Time, c.ID)
		out = append(out, c)
	}
	return out, total, rows.Err()
}
