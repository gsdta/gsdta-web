// API Client
export {
  ApiError,
  apiFetch,
  withTrailingSlash,
  type ApiFetchOptions,
  type ApiResponse,
} from "./client";

// Student API
export {
  createStudent,
  getMyStudents,
  getStudentById,
  updateStudent,
  adminGetStudents,
  adminGetStudent,
  adminAdmitStudent,
  adminAssignClass,
  adminUpdateStudent,
  getStudent,
  listStudents,
  type AdminStudentsListParams,
} from "./student";

// Attendance API
export {
  getClassRoster,
  getAttendance,
  saveAttendance,
} from "./attendance";

// Class API
export {
  adminGetClasses,
  adminGetClassOptions,
  adminGetClass,
  adminCreateClass,
  adminUpdateClass,
  adminGetClassTeachers,
  adminAssignTeacher,
  adminRemoveTeacher,
  adminUpdateTeacherRole,
  getPrimaryTeacher,
  getAssistantTeachers,
  formatTeachersDisplay,
  type ClassTeacherRole,
  type ClassTeacher,
  type ClassOption,
  type AdminClass,
  type CreateClassInput,
  type UpdateClassInput,
  type AssignTeacherInput,
} from "./class";

// Enrollment API
export {
  getClasses,
  getEnrollments,
  createEnrollment,
  updateEnrollmentStatus,
} from "./enrollment";

// Grade API
export {
  adminGetGrades,
  adminGetGradeOptions,
  adminGetGrade,
  adminCreateGrade,
  adminUpdateGrade,
  adminSeedGrades,
  adminCheckGradesSeeded,
} from "./grade";

// Parent API
export {
  getProfile,
  updateProfile,
  getLinkedStudents,
} from "./parent";

// Textbook API
export {
  adminGetTextbooks,
  adminGetTextbook,
  adminCreateTextbook,
  adminUpdateTextbook,
  adminDeleteTextbook,
} from "./textbook";

// Volunteer API
export {
  adminGetVolunteers,
  adminGetVolunteer,
  adminCreateVolunteer,
  adminUpdateVolunteer,
  adminDeleteVolunteer,
} from "./volunteer";
