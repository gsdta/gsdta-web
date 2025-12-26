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
