-- GSDTA PostgreSQL schema
-- Target: PostgreSQL 14+
-- DB: gsdta (create this DB beforehand)

BEGIN;

-- Extensions (for UUID generation)
CREATE
EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid()

-- Utility trigger to auto-update updated_at
CREATE
OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at
= now();
RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- USERS: optional principal directory for admin/teacher/parent
-- Note: current app uses stub auth; this table supports future OIDC/Firebase sync
CREATE TABLE IF NOT EXISTS users
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    roles text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE
    ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- GUARDIANS (parents)
-- Keep user_id as text for now to avoid coupling to users table population
CREATE TABLE IF NOT EXISTS guardians
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    user_id text NOT NULL,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE INDEX IF NOT EXISTS guardians_user_id_idx ON guardians (user_id);
CREATE TRIGGER guardians_set_updated_at
    BEFORE UPDATE
    ON guardians
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- STUDENTS
CREATE TABLE IF NOT EXISTS students
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    guardian_id uuid NOT NULL REFERENCES guardians
(
    id
) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    dob date,
    prior_level text,
    medical_notes text,
    photo_consent boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE INDEX IF NOT EXISTS students_guardian_idx ON students (guardian_id);
CREATE TRIGGER students_set_updated_at
    BEFORE UPDATE
    ON students
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- TERMS (semesters/sessions)
CREATE TABLE IF NOT EXISTS terms
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    name text NOT NULL UNIQUE,
    start_date date,
    end_date date,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE TRIGGER terms_set_updated_at
    BEFORE UPDATE
    ON terms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CAMPUSES
CREATE TABLE IF NOT EXISTS campuses
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE TRIGGER campuses_set_updated_at
    BEFORE UPDATE
    ON campuses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    campus_id uuid NOT NULL REFERENCES campuses
(
    id
) ON DELETE CASCADE,
    name text NOT NULL,
    capacity integer NOT NULL CHECK
(
    capacity >
    0
),
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
),
    UNIQUE
(
    campus_id,
    name
)
    );
CREATE INDEX IF NOT EXISTS rooms_campus_idx ON rooms (campus_id);
CREATE TRIGGER rooms_set_updated_at
    BEFORE UPDATE
    ON rooms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- CLASSES (course sections)
CREATE TABLE IF NOT EXISTS classes
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    term_id uuid NOT NULL REFERENCES terms
(
    id
) ON DELETE CASCADE,
    campus_id uuid NOT NULL REFERENCES campuses
(
    id
)
  ON DELETE CASCADE,
    room_id uuid NOT NULL REFERENCES rooms
(
    id
)
  ON DELETE RESTRICT,
    teacher_id text,
    level text,
    weekday smallint NOT NULL CHECK
(
    weekday
    BETWEEN
    0
    AND
    6
),
    start_hhmm char
(
    5
) NOT NULL,
    end_hhmm char
(
    5
) NOT NULL,
    capacity integer NOT NULL CHECK
(
    capacity >
    0
),
    playlist_id text,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE INDEX IF NOT EXISTS classes_term_idx ON classes (term_id);
CREATE INDEX IF NOT EXISTS classes_campus_idx ON classes (campus_id);
CREATE INDEX IF NOT EXISTS classes_room_idx ON classes (room_id);
CREATE INDEX IF NOT EXISTS classes_teacher_idx ON classes (teacher_id);
CREATE TRIGGER classes_set_updated_at
    BEFORE UPDATE
    ON classes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    student_id uuid NOT NULL REFERENCES students
(
    id
) ON DELETE CASCADE,
    class_id uuid NOT NULL REFERENCES classes
(
    id
)
  ON DELETE CASCADE,
    status text NOT NULL CHECK
(
    status
    IN
(
    'applied',
    'waitlisted',
    'enrolled',
    'rejected',
    'dropped'
)),
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
),
    UNIQUE
(
    student_id,
    class_id
)
    );
CREATE INDEX IF NOT EXISTS enrollments_class_idx ON enrollments (class_id);
CREATE INDEX IF NOT EXISTS enrollments_student_idx ON enrollments (student_id);
CREATE INDEX IF NOT EXISTS enrollments_status_idx ON enrollments (status);
CREATE TRIGGER enrollments_set_updated_at
    BEFORE UPDATE
    ON enrollments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ATTENDANCE (one sheet per class/date)
CREATE TABLE IF NOT EXISTS attendance
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    class_id uuid NOT NULL REFERENCES classes
(
    id
) ON DELETE CASCADE,
    date date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
),
    UNIQUE
(
    class_id,
    date
)
    );
CREATE INDEX IF NOT EXISTS attendance_class_idx ON attendance (class_id);
CREATE TRIGGER attendance_set_updated_at
    BEFORE UPDATE
    ON attendance
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ATTENDANCE RECORDS (per student per sheet)
CREATE TABLE IF NOT EXISTS attendance_records
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    attendance_id uuid NOT NULL REFERENCES attendance
(
    id
) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES students
(
    id
)
  ON DELETE CASCADE,
    status text NOT NULL CHECK
(
    status
    IN
(
    'present',
    'late',
    'absent'
)),
    at timestamptz NOT NULL DEFAULT now
(
),
    UNIQUE
(
    attendance_id,
    student_id
)
    );
CREATE INDEX IF NOT EXISTS attendance_records_attendance_idx ON attendance_records (attendance_id);
CREATE INDEX IF NOT EXISTS attendance_records_student_idx ON attendance_records (student_id);

-- ASSESSMENTS
CREATE TABLE IF NOT EXISTS assessments
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    class_id uuid NOT NULL REFERENCES classes
(
    id
) ON DELETE CASCADE,
    title text NOT NULL,
    date timestamptz NOT NULL,
    level text,
    max_score integer NOT NULL CHECK
(
    max_score >
    0
),
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE INDEX IF NOT EXISTS assessments_class_idx ON assessments (class_id);
CREATE TRIGGER assessments_set_updated_at
    BEFORE UPDATE
    ON assessments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- SCORES
CREATE TABLE IF NOT EXISTS scores
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    assessment_id uuid NOT NULL REFERENCES assessments
(
    id
) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES students
(
    id
)
  ON DELETE CASCADE,
    value double precision NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
),
    UNIQUE
(
    assessment_id,
    student_id
)
    );
CREATE INDEX IF NOT EXISTS scores_assessment_idx ON scores (assessment_id);
CREATE INDEX IF NOT EXISTS scores_student_idx ON scores (student_id);
CREATE TRIGGER scores_set_updated_at
    BEFORE UPDATE
    ON scores
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- EVENTS
CREATE TABLE IF NOT EXISTS events
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    title text NOT NULL,
    start_ts timestamptz NOT NULL,
    end_ts timestamptz NOT NULL,
    location text,
    capacity integer NOT NULL DEFAULT 0 CHECK
(
    capacity
    >=
    0
),
    eligibility_level text,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE TRIGGER events_set_updated_at
    BEFORE UPDATE
    ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- EVENT REGISTRATIONS
CREATE TABLE IF NOT EXISTS event_registrations
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    event_id uuid NOT NULL REFERENCES events
(
    id
) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES students
(
    id
)
  ON DELETE CASCADE,
    status text NOT NULL CHECK
(
    status
    IN
(
    'registered',
    'waitlisted',
    'cancelled'
)),
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
),
    UNIQUE
(
    event_id,
    student_id
)
    );
CREATE INDEX IF NOT EXISTS event_regs_event_idx ON event_registrations (event_id);
CREATE INDEX IF NOT EXISTS event_regs_student_idx ON event_registrations (student_id);
CREATE INDEX IF NOT EXISTS event_regs_status_idx ON event_registrations (status);
CREATE TRIGGER event_regs_set_updated_at
    BEFORE UPDATE
    ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements
(
    id
    uuid
    PRIMARY
    KEY
    DEFAULT
    gen_random_uuid
(
),
    scope text NOT NULL CHECK
(
    scope
    IN
(
    'school',
    'class'
)),
    class_id uuid REFERENCES classes
(
    id
) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    publish_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now
(
),
    updated_at timestamptz NOT NULL DEFAULT now
(
)
    );
CREATE INDEX IF NOT EXISTS announcements_scope_idx ON announcements (scope);
CREATE INDEX IF NOT EXISTS announcements_class_idx ON announcements (class_id);
CREATE INDEX IF NOT EXISTS announcements_publish_idx ON announcements (publish_at);
CREATE TRIGGER announcements_set_updated_at
    BEFORE UPDATE
    ON announcements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;

