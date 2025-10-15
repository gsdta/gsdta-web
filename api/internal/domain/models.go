package domain

import "time"

// Meta contains common fields for all aggregates.
type Meta struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Role represents a user role in the system.
type Role string

const (
	RoleAdmin   Role = "admin"
	RoleTeacher Role = "teacher"
	RoleParent  Role = "parent"
)

// User represents a system user/principal.
type User struct {
	Meta
	Email string `json:"email"`
	Name  string `json:"name"`
	Roles []Role `json:"roles"`
}

// Guardian (parent) account linked to a user.
type Guardian struct {
	Meta
	UserID string `json:"userId"`
	Phone  string `json:"phone"`
}

// Student profile.
type Student struct {
	Meta
	GuardianID   string    `json:"guardianId"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	DOB          time.Time `json:"dob"`
	PriorLevel   string    `json:"priorLevel"`
	MedicalNotes string    `json:"medicalNotes"`
	PhotoConsent bool      `json:"photoConsent"`
}

// Term (semester/session).
type Term struct {
	Meta
	Name      string    `json:"name"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
}

// Campus location.
type Campus struct {
	Meta
	Name string `json:"name"`
}

// Room within a campus.
type Room struct {
	Meta
	CampusID string `json:"campusId"`
	Name     string `json:"name"`
	Capacity int    `json:"capacity"`
}

// Class (course section) offering.
type Class struct {
	Meta
	TermID     string `json:"termId"`
	CampusID   string `json:"campusId"`
	RoomID     string `json:"roomId"`
	TeacherID  string `json:"teacherId"`
	Level      string `json:"level"`
	Weekday    int    `json:"weekday"`   // 0=Sunday .. 6=Saturday
	StartHHMM  string `json:"startHHMM"` // e.g., "15:30"
	EndHHMM    string `json:"endHHMM"`
	Capacity   int    `json:"capacity"`
	PlaylistID string `json:"playlistId"`
}

// Enrollment status values.
type EnrollmentStatus string

const (
	EnrollmentApplied    EnrollmentStatus = "applied"
	EnrollmentWaitlisted EnrollmentStatus = "waitlisted"
	EnrollmentEnrolled   EnrollmentStatus = "enrolled"
	EnrollmentRejected   EnrollmentStatus = "rejected"
	EnrollmentDropped    EnrollmentStatus = "dropped"
)

// Enrollment linking a student to a class.
type Enrollment struct {
	Meta
	StudentID string           `json:"studentId"`
	ClassID   string           `json:"classId"`
	Status    EnrollmentStatus `json:"status"`
}

// Attendance marking.
type AttendanceStatus string

const (
	AttendancePresent AttendanceStatus = "present"
	AttendanceLate    AttendanceStatus = "late"
	AttendanceAbsent  AttendanceStatus = "absent"
)

type AttendanceRecord struct {
	StudentID string           `json:"studentId"`
	Status    AttendanceStatus `json:"status"`
	At        time.Time        `json:"at"`
}

// Attendance sheet per class/date.
type Attendance struct {
	Meta
	ClassID string             `json:"classId"`
	Date    string             `json:"date"` // YYYY-MM-DD
	Records []AttendanceRecord `json:"records"`
}

// Assessment definition.
type Assessment struct {
	Meta
	ClassID  string    `json:"classId"`
	Title    string    `json:"title"`
	Date     time.Time `json:"date"`
	Level    string    `json:"level"`
	MaxScore int       `json:"maxScore"`
}

// Score for an assessment.
type Score struct {
	Meta
	AssessmentID string  `json:"assessmentId"`
	StudentID    string  `json:"studentId"`
	Value        float64 `json:"value"`
}

// Event and registrations.
type Event struct {
	Meta
	Title            string    `json:"title"`
	Start            time.Time `json:"start"`
	End              time.Time `json:"end"`
	Location         string    `json:"location"`
	Capacity         int       `json:"capacity"`
	EligibilityLevel string    `json:"eligibilityLevel"`
}

type EventRegistration struct {
	Meta
	EventID   string `json:"eventId"`
	StudentID string `json:"studentId"`
	Status    string `json:"status"` // registered|waitlisted|cancelled
}

// Announcement entity.
type Announcement struct {
	Meta
	Scope     string    `json:"scope"` // school|class
	ClassID   string    `json:"classId"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	PublishAt time.Time `json:"publishAt"`
}
