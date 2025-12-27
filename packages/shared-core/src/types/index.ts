// Auth types
export {
  type Role,
  type AuthProvider,
  type User,
} from './auth';

// Student types
export {
  type StudentStatus,
  type Gender,
  type ParentContact,
  type StudentContacts,
  type StudentAddress,
  type CreateStudentInput,
  type UpdateStudentInput,
  type Student,
  type StudentListItem,
  type StudentStatusCounts,
  COMMON_SCHOOL_DISTRICTS,
  genderOptions,
  createStudentSchema,
  updateStudentSchema,
  studentSchema,
  newStudentDefaults,
  tamilLevelOptions,
  statusConfig,
} from './student';

// Attendance types
export {
  type AttendanceStatus,
  type AttendanceRecord,
  type RosterStudent,
  type AttendanceWithStudent,
} from './attendance';

// Enrollment types
export {
  type EnrollmentStatus,
  type Enrollment,
  type Class,
  type EnrollmentWithDetails,
} from './enrollment';

// Grade types
export {
  type GradeStatus,
  type Grade,
  type GradeOption,
  type CreateGradeInput,
  type UpdateGradeInput,
  type GradesResponse,
  type SeedGradesResponse,
} from './grade';

// Parent types
export {
  type Address,
  type NotificationPreferences,
  type ProfileUpdatePayload,
  type UserProfile,
  type LinkedStudent,
  type ProfileResponse,
  type StudentsResponse,
  addressSchema,
  notificationPreferencesSchema,
  profileUpdateSchema,
} from './parent';

// Textbook types
export {
  type TextbookType,
  type TextbookStatus,
  type Textbook,
  type CreateTextbookInput,
  type UpdateTextbookInput,
  type TextbookListFilters,
  type TextbookListResponse,
  TEXTBOOK_TYPES,
  SEMESTERS,
  CURRENT_ACADEMIC_YEAR,
  getTextbookTypeLabel,
} from './textbook';

// Volunteer types
export {
  type VolunteerType,
  type VolunteerStatus,
  type VolunteerClassAssignment,
  type EmergencyContact,
  type HoursLogEntry,
  type Volunteer,
  type CreateVolunteerInput,
  type UpdateVolunteerInput,
  type VolunteerListFilters,
  type VolunteerListResponse,
  VOLUNTEER_TYPES,
  GRADE_LEVELS,
  DAYS_OF_WEEK,
  CURRENT_ACADEMIC_YEAR as VOLUNTEER_CURRENT_ACADEMIC_YEAR,
  getVolunteerTypeLabel,
} from './volunteer';
