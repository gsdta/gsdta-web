-- GSDTA PostgreSQL seed data (one-off)
-- Assumes schema from gsdta.sql is already applied to the current database
-- Inserts a minimal dev dataset: term, campus, room, class, guardian, two students,
-- enrollments, one assessment with scores, an event with registrations, and a school announcement.

BEGIN;

WITH term AS (
INSERT
INTO terms (name, start_date, end_date)
VALUES ('Fall Dev', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '60 days')
    RETURNING id
    ), camp AS (
INSERT
INTO campuses (name)
VALUES ('Main')
    RETURNING id
    ), room AS (
INSERT
INTO rooms (campus_id, name, capacity)
SELECT camp.id, 'R101', 12
FROM camp
    RETURNING id, campus_id
    ), cls AS (
INSERT
INTO classes (term_id, campus_id, room_id, teacher_id, level, weekday, start_hhmm, end_hhmm, capacity, playlist_id)
SELECT term.id, camp.id, room.id, 'teacher1', 'L1', 2, '15:30', '16:30', 12, NULL
FROM term, camp, room
    RETURNING id
    ), guard AS (
INSERT
INTO guardians (user_id, phone)
VALUES ('dev-parent', '+1-555-0100')
    RETURNING id
    ), stud1 AS (
INSERT
INTO students (guardian_id, first_name, last_name, dob, photo_consent)
SELECT guard.id, 'Dev', 'Student', DATE '2015-01-01', TRUE
FROM guard
    RETURNING id
    ), stud2 AS (
INSERT
INTO students (guardian_id, first_name, last_name, dob, photo_consent)
SELECT guard.id, 'Test', 'Student', DATE '2014-02-02', FALSE
FROM guard
    RETURNING id
    ), en1 AS (
INSERT
INTO enrollments (student_id, class_id, status)
SELECT stud1.id, cls.id, 'enrolled'
FROM stud1, cls
    RETURNING id
    ), en2 AS (
INSERT
INTO enrollments (student_id, class_id, status)
SELECT stud2.id, cls.id, 'enrolled'
FROM stud2, cls
    RETURNING id
    ), ass AS (
INSERT
INTO assessments (class_id, title, date, level, max_score)
SELECT cls.id, 'Quiz 1', NOW(), 'L1', 10
FROM cls
    RETURNING id
    ), sc1 AS (
INSERT
INTO scores (assessment_id, student_id, value)
SELECT ass.id, stud1.id, 8
FROM ass, stud1
    RETURNING id
    ), sc2 AS (
INSERT
INTO scores (assessment_id, student_id, value)
SELECT ass.id, stud2.id, 6
FROM ass, stud2
    RETURNING id
    ), ev AS (
INSERT
INTO events (title, start_ts, end_ts, location, capacity, eligibility_level)
VALUES ('Recital', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days 1 hour', 'Hall', 1, NULL)
    RETURNING id
    ), reg1 AS (
INSERT
INTO event_registrations (event_id, student_id, status)
SELECT ev.id, stud1.id, 'registered'
FROM ev, stud1
    RETURNING id
    ), reg2 AS (
INSERT
INTO event_registrations (event_id, student_id, status)
SELECT ev.id, stud2.id, 'waitlisted'
FROM ev, stud2
    RETURNING id
    )
INSERT
INTO announcements (scope, class_id, title, body, publish_at)
VALUES ('school', NULL, 'Welcome', 'Welcome to the Fall Dev term!', NOW());

COMMIT;

