package postgres

import (
	"context"
	"database/sql"

	"github.com/gsdta/api/internal/domain"
	"github.com/gsdta/api/internal/store"
)

type studentRepo Store

func (r *studentRepo) Create(ctx context.Context, in domain.Student) (domain.Student, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `INSERT INTO students (guardian_id, first_name, last_name, dob, prior_level, medical_notes, photo_consent) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at, updated_at`,
		in.GuardianID, in.FirstName, in.LastName, in.DOB, in.PriorLevel, in.MedicalNotes, in.PhotoConsent)
	var id string
	var created, updated sql.NullTime
	if err := row.Scan(&id, &created, &updated); err != nil {
		return domain.Student{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, id)
	return in, nil
}
func (r *studentRepo) Get(ctx context.Context, id string) (domain.Student, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `SELECT id, guardian_id, first_name, last_name, dob, prior_level, medical_notes, photo_consent, created_at, updated_at FROM students WHERE id=$1`, id)
	var out domain.Student
	var created, updated sql.NullTime
	if err := row.Scan(&out.ID, &out.GuardianID, &out.FirstName, &out.LastName, &out.DOB, &out.PriorLevel, &out.MedicalNotes, &out.PhotoConsent, &created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Student{}, notFound("student", id)
		}
		return domain.Student{}, err
	}
	out.Meta = scanMeta(created.Time, updated.Time, out.ID)
	return out, nil
}
func (r *studentRepo) Update(ctx context.Context, in domain.Student) (domain.Student, error) {
	s := (*Store)(r)
	row := s.db.QueryRowContext(ctx, `UPDATE students SET guardian_id=$1, first_name=$2, last_name=$3, dob=$4, prior_level=$5, medical_notes=$6, photo_consent=$7, updated_at=now() WHERE id=$8 RETURNING created_at, updated_at`,
		in.GuardianID, in.FirstName, in.LastName, in.DOB, in.PriorLevel, in.MedicalNotes, in.PhotoConsent, in.ID)
	var created, updated sql.NullTime
	if err := row.Scan(&created, &updated); err != nil {
		if isNoRows(err) {
			return domain.Student{}, notFound("student", in.ID)
		}
		return domain.Student{}, err
	}
	in.Meta = scanMeta(created.Time, updated.Time, in.ID)
	return in, nil
}
func (r *studentRepo) Delete(ctx context.Context, id string) error {
	s := (*Store)(r)
	res, err := s.db.ExecContext(ctx, `DELETE FROM students WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return notFound("student", id)
	}
	return nil
}
func (r *studentRepo) List(ctx context.Context, opts store.ListOptions) ([]domain.Student, int, error) {
	s := (*Store)(r)
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT count(*) FROM students`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id, guardian_id, first_name, last_name, dob, prior_level, medical_notes, photo_consent, created_at, updated_at FROM students `+orderBy(opts)+` `+page(opts))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Student
	for rows.Next() {
		var st domain.Student
		var created, updated sql.NullTime
		if err := rows.Scan(&st.ID, &st.GuardianID, &st.FirstName, &st.LastName, &st.DOB, &st.PriorLevel, &st.MedicalNotes, &st.PhotoConsent, &created, &updated); err != nil {
			return nil, 0, err
		}
		st.Meta = scanMeta(created.Time, updated.Time, st.ID)
		out = append(out, st)
	}
	return out, total, rows.Err()
}
