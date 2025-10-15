package apihttp

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

var minimalOpenAPI = []byte(`{
  "openapi": "3.0.3",
  "info": {"title": "GSDTA API", "version": "0.1.0", "description": "API for classes, enrollments, attendance, assessments, events, and more."},
  "components": {
    "schemas": {
      "Meta": {
        "type": "object",
        "properties": {
          "id": {"type": "string", "example": "a1b2c3"},
          "createdAt": {"type": "string", "format": "date-time"},
          "updatedAt": {"type": "string", "format": "date-time"}
        }
      },
      "Role": {"type": "string", "enum": ["admin", "teacher", "parent"]},
      "Principal": {
        "type": "object",
        "properties": {
          "id": {"type": "string", "example": "uid-123"},
          "email": {"type": "string", "format": "email", "example": "user@example.com"},
          "name": {"type": "string", "example": "User Name"},
          "roles": {"type": "array", "items": {"$ref": "#/components/schemas/Role"}}
        }
      },
      "Guardian": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"userId": {"type": "string"}, "phone": {"type": "string"}}}]},
      "Student": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"guardianId": {"type": "string"}, "firstName": {"type": "string"}, "lastName": {"type": "string"}, "dob": {"type": "string", "format": "date-time"}, "priorLevel": {"type": "string"}, "medicalNotes": {"type": "string"}, "photoConsent": {"type": "boolean"}}}]},
      "Term": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"name": {"type": "string"}, "startDate": {"type": "string", "format": "date-time"}, "endDate": {"type": "string", "format": "date-time"}}}]},
      "Campus": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"name": {"type": "string"}}}]},
      "Room": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"campusId": {"type": "string"}, "name": {"type": "string"}, "capacity": {"type": "integer"}}}]},
      "Class": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"termId": {"type": "string"}, "campusId": {"type": "string"}, "roomId": {"type": "string"}, "teacherId": {"type": "string"}, "level": {"type": "string"}, "weekday": {"type": "integer", "minimum": 0, "maximum": 6}, "startHHMM": {"type": "string", "example": "15:30"}, "endHHMM": {"type": "string", "example": "16:30"}, "capacity": {"type": "integer"}, "playlistId": {"type": "string"}}}]},
      "EnrollmentStatus": {"type": "string", "enum": ["applied", "waitlisted", "enrolled", "rejected", "dropped"]},
      "Enrollment": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"studentId": {"type": "string"}, "classId": {"type": "string"}, "status": {"$ref": "#/components/schemas/EnrollmentStatus"}}}]},
      "AttendanceStatus": {"type": "string", "enum": ["present", "late", "absent"]},
      "AttendanceRecord": {"type": "object", "properties": {"studentId": {"type": "string"}, "status": {"$ref": "#/components/schemas/AttendanceStatus"}, "at": {"type": "string", "format": "date-time"}}},
      "Attendance": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"classId": {"type": "string"}, "date": {"type": "string", "description": "YYYY-MM-DD", "example": "2025-08-25"}, "records": {"type": "array", "items": {"$ref": "#/components/schemas/AttendanceRecord"}}}}]},
      "Assessment": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"classId": {"type": "string"}, "title": {"type": "string"}, "date": {"type": "string", "format": "date-time"}, "level": {"type": "string"}, "maxScore": {"type": "integer"}}}]},
      "Score": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"assessmentId": {"type": "string"}, "studentId": {"type": "string"}, "value": {"type": "number"}}}]},
      "Event": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"title": {"type": "string"}, "start": {"type": "string", "format": "date-time"}, "end": {"type": "string", "format": "date-time"}, "location": {"type": "string"}, "capacity": {"type": "integer"}, "eligibilityLevel": {"type": "string"}}}]},
      "EventRegistration": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"eventId": {"type": "string"}, "studentId": {"type": "string"}, "status": {"type": "string", "enum": ["registered", "waitlisted", "cancelled"]}}}]},
      "Announcement": {"allOf": [{"$ref": "#/components/schemas/Meta"}, {"type": "object", "properties": {"scope": {"type": "string", "enum": ["school", "class"]}, "classId": {"type": "string"}, "title": {"type": "string"}, "body": {"type": "string"}, "publishAt": {"type": "string", "format": "date-time"}}}]},
      "AnnouncementOut": {"type": "object", "properties": {"id": {"type": "string"}, "scope": {"type": "string", "enum": ["school", "class"]}, "classId": {"type": "string"}, "title": {"type": "string"}, "body": {"type": "string"}, "publishAt": {"type": "string", "format": "date-time"}}},
      "ListResponse": {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object"}}, "total": {"type": "integer"}}},
      "CalendarItem": {"type": "object", "properties": {"kind": {"type": "string", "enum": ["class", "event"]}, "title": {"type": "string"}, "start": {"type": "string", "format": "date-time"}, "end": {"type": "string", "format": "date-time"}, "weekday": {"type": "integer", "minimum": 0, "maximum": 6}, "startHHMM": {"type": "string"}, "endHHMM": {"type": "string"}, "location": {"type": "string"}, "classId": {"type": "string"}, "eventId": {"type": "string"}, "termId": {"type": "string"}, "campusId": {"type": "string"}}},
      "CalendarResponse": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/CalendarItem"}}}},
      "CreateAssessmentRequest": {"type": "object", "required": ["classId", "title", "maxScore"], "properties": {"classId": {"type": "string"}, "title": {"type": "string"}, "date": {"type": "string", "format": "date-time"}, "level": {"type": "string"}, "maxScore": {"type": "integer", "minimum": 1}}},
      "ScoreInput": {"type": "object", "properties": {"studentId": {"type": "string"}, "value": {"type": "number"}}},
      "StudentScore": {"type": "object", "properties": {"id": {"type": "string"}, "assessmentId": {"type": "string"}, "title": {"type": "string"}, "date": {"type": "string", "format": "date-time"}, "maxScore": {"type": "integer"}, "value": {"type": "number"}}},
      "StudentScoresResponse": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/StudentScore"}}}},
      "ApplyEnrollmentRequest": {"type": "object", "required": ["studentId", "classId"], "properties": {"studentId": {"type": "string"}, "classId": {"type": "string"}}},
      "SetEnrollmentStatusRequest": {"type": "object", "required": ["status"], "properties": {"status": {"$ref": "#/components/schemas/EnrollmentStatus"}}},
      "DropEnrollmentResponse": {"type": "object", "properties": {"dropped": {"$ref": "#/components/schemas/Enrollment"}, "promoted": {"$ref": "#/components/schemas/Enrollment"}}},
      "EventRegistrationRequest": {"type": "object", "required": ["studentId"], "properties": {"studentId": {"type": "string"}}},
      "EventRegistrationResponse": {"type": "object", "properties": {"id": {"type": "string"}, "eventId": {"type": "string"}, "studentId": {"type": "string"}, "status": {"type": "string", "enum": ["registered", "waitlisted", "cancelled"]}}},
      "ListEventRegistrations": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/EventRegistrationResponse"}}, "total": {"type": "integer"}}},
      "CancelEventRegistrationResponse": {"type": "object", "properties": {"cancelled": {"$ref": "#/components/schemas/EventRegistrationResponse"}, "promoted": {"$ref": "#/components/schemas/EventRegistrationResponse"}}},
      "AnnouncementList": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/AnnouncementOut"}}, "total": {"type": "integer"}}},
      "EnrollmentCountsReport": {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"classId": {"type": "string"}, "level": {"type": "string"}, "count": {"type": "integer"}}}}}},
      "AttendanceRatesReport": {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"classId": {"type": "string"}, "studentId": {"type": "string"}, "present": {"type": "integer"}, "total": {"type": "integer"}}}}}},
      "ScoresReport": {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"studentId": {"type": "string"}, "count": {"type": "integer"}, "avg": {"type": "number"}}}}}},
      "EventRegistrationsReport": {"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"eventId": {"type": "string"}, "studentId": {"type": "string"}, "status": {"type": "string"}}}}}},
      "AttendanceUpsertRequest": {"type": "object", "properties": {"records": {"type": "array", "items": {"$ref": "#/components/schemas/AttendanceRecord"}}, "markAllPresent": {"type": "boolean"}}},
      "VersionInfo": {"type": "object", "properties": {"version": {"type": "string"}, "commit": {"type": "string"}, "buildTime": {"type": "string"}, "goVersion": {"type": "string"}}},
      "Problem": {"type": "object", "properties": {"type": {"type": "string"}, "title": {"type": "string"}, "status": {"type": "integer"}, "detail": {"type": "string"}, "instance": {"type": "string"}, "extras": {"type": "object", "additionalProperties": true}, "time": {"type": "string", "format": "date-time"}}}
    }
  },
  "paths": {
    "/healthz": {
      "get": {
        "summary": "Health check",
        "responses": {
          "200": {"description": "ok", "content": {"text/plain": {"schema": {"type": "string"}, "example": "ok"}}}}
        }
      }
    },
    "/v1/version": {
      "get": {
        "summary": "Version info",
        "responses": {
          "200": {"description": "Version JSON", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/VersionInfo"}, "example": {"version": "dev", "commit": "abcdef0", "buildTime": "2025-01-01T00:00:00Z", "goVersion": "go1.22.0"}}}}
        }
      }
    },

    "/v1/guardians": {
      "get": {
        "summary": "List guardians (auth; admin sees all, parent sees own)",
        "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Guardian"}}, "total": {"type": "integer"}}}, "example": {"items": [{"id": "g1", "userId": "u1", "phone": "+1-555-1234"}], "total": 1}}}}, "401": {"description": "Unauthorized", "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}}
      },
      "post": {
        "summary": "Create guardian (admin or parent self)",
        "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Guardian"}, "example": {"userId": "u1", "phone": "+1-555-1234"}}}},
        "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Guardian"}}}}, "400": {"description": "Bad request"}, "401": {"description": "Unauthorized"}, "403": {"description": "Forbidden"}}
      }
    },
    "/v1/guardians/{id}": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Get guardian (auth; admin or owner)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Guardian"}, "example": {"id": "g1", "userId": "u1", "phone": "+1-555-1234"}}}}, "403": {"description": "Forbidden"}, "404": {"description": "Not found"}}},
      "put": {"summary": "Update guardian (auth; admin or owner)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Guardian"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Guardian"}}}}, "403": {"description": "Forbidden"}}},
      "delete": {"summary": "Delete guardian (admin)", "responses": {"204": {"description": "No content"}, "403": {"description": "Forbidden"}}}
    },

    "/v1/students": {
      "get": {"summary": "List students (auth; admin all, parent owns)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Student"}}, "total": {"type": "integer"}}}}}}},
      "post": {"summary": "Create student (auth; admin or parent)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Student"}, "example": {"guardianId": "g1", "firstName": "Ada", "lastName": "Lovelace", "dob": "2015-05-12T00:00:00Z"}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Student"}}}}}}
    },
    "/v1/students/{id}": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Get student (auth; admin or owner)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Student"}}}}, "403": {"description": "Forbidden"}, "404": {"description": "Not found"}}},
      "put": {"summary": "Update student (auth; admin or owner)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Student"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Student"}}}}},
      "delete": {"summary": "Delete student (auth; admin or owner)", "responses": {"204": {"description": "No content"}}}
    },
    "/v1/students/{id}/scores": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "List scores for a student (auth; admin or owner)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/StudentScoresResponse"}, "example": {"items": [{"id": "s1", "assessmentId": "a1", "title": "Quiz 1", "date": "2025-09-10T00:00:00Z", "maxScore": 100, "value": 95}]}}}}}}
    },

    "/v1/terms": {
      "get": {"summary": "List terms (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Term"}}, "total": {"type": "integer"}}}}}}},
      "post": {"summary": "Create term (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Term"}, "example": {"name": "Fall 2025", "startDate": "2025-09-01T00:00:00Z", "endDate": "2025-12-15T00:00:00Z"}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Term"}}}}}}
    },
    "/v1/terms/{id}": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Get term (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Term"}}}}, "404": {"description": "Not found"}}},
      "put": {"summary": "Update term (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Term"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Term"}}}}},
      "delete": {"summary": "Delete term (admin)", "responses": {"204": {"description": "No content"}}}
    },

    "/v1/campuses": {
      "get": {"summary": "List campuses (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Campus"}}, "total": {"type": "integer"}}}}}}},
      "post": {"summary": "Create campus (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Campus"}, "example": {"name": "Main Campus"}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Campus"}}}}}}
    },
    "/v1/campuses/{id}": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Get campus (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Campus"}}}}, "404": {"description": "Not found"}}},
      "put": {"summary": "Update campus (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Campus"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Campus"}}}}},
      "delete": {"summary": "Delete campus (admin)", "responses": {"204": {"description": "No content"}}}
    },

    "/v1/rooms": {
      "get": {"summary": "List rooms (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Room"}}, "total": {"type": "integer"}}}}}}},
      "post": {"summary": "Create room (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Room"}, "example": {"campusId": "c1", "name": "R101", "capacity": 20}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Room"}}}}}}
    },
    "/v1/rooms/{id}": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Get room (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Room"}}}}, "404": {"description": "Not found"}}},
      "put": {"summary": "Update room (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Room"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Room"}}}}},
      "delete": {"summary": "Delete room (admin)", "responses": {"204": {"description": "No content"}}}
    },

    "/v1/classes": {
      "get": {"summary": "List classes (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Class"}}, "total": {"type": "integer"}}}}}}},
      "post": {"summary": "Create class (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Class"}, "example": {"termId": "t1", "campusId": "c1", "roomId": "r1", "teacherId": "u-teach", "level": "Beginner", "weekday": 2, "startHHMM": "15:30", "endHHMM": "16:30", "capacity": 10}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Class"}}}}}}
    },
    "/v1/classes/{id}": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Get class (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Class"}}}}, "404": {"description": "Not found"}}},
      "put": {"summary": "Update class (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Class"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Class"}}}}},
      "delete": {"summary": "Delete class (admin)", "responses": {"204": {"description": "No content"}}}
    },
    "/v1/classes/{id}/announcements": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Class announcements (auth; admin/teacher/parent enrolled)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AnnouncementList"}}}}, "403": {"description": "Forbidden"}}}
    },

    "/v1/classes/{id}/attendance/{date}": {
      "parameters": [
        {"name": "id", "in": "path", "required": true, "schema": {"type": "string"}},
        {"name": "date", "in": "path", "required": true, "schema": {"type": "string", "description": "YYYY-MM-DD"}}
      ],
      "get": {"summary": "Get attendance (teacher/admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Attendance"}, "example": {"classId": "cls1", "date": "2025-09-10", "records": [{"studentId": "s1", "status": "present", "at": "2025-09-10T15:30:00Z"}]}}}}, "403": {"description": "Forbidden"}}},
      "put": {"summary": "Upsert attendance (teacher/admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AttendanceUpsertRequest"}, "example": {"records": [{"studentId": "s1", "status": "present"}], "markAllPresent": false}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Attendance"}}}}},
      "post": {"summary": "Upsert attendance (teacher/admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AttendanceUpsertRequest"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Attendance"}}}}}}
    },

    "/v1/assessments": {
      "post": {"summary": "Create assessment (admin/teacher)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CreateAssessmentRequest"}, "example": {"classId": "cls1", "title": "Quiz 1", "date": "2025-09-10T00:00:00Z", "level": "A1", "maxScore": 100}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Assessment"}}}}, "400": {"description": "Bad request"}}}
    },
    "/v1/assessments/{id}/scores": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "post": {"summary": "Bulk score entry (admin/teacher)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"type": "array", "items": {"$ref": "#/components/schemas/ScoreInput"}}, "example": [{"studentId": "s1", "value": 95}, {"studentId": "s2", "value": 88}]}}}, "responses": {"204": {"description": "No content"}, "400": {"description": "Bad request"}}}
    },

    "/v1/enrollments:apply": {
      "post": {"summary": "Apply for class enrollment (public)", "security": [], "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ApplyEnrollmentRequest"}, "example": {"studentId": "s1", "classId": "cls1"}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Enrollment"}}}, "400": {"description": "Bad request"}}}}
    },
    "/v1/enrollments/{id}": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Get enrollment by id (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Enrollment"}}}}, "404": {"description": "Not found"}}}
    },
    "/v1/enrollments/{id}:setStatus": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "post": {"summary": "Set enrollment status (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/SetEnrollmentStatusRequest"}, "example": {"status": "enrolled"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Enrollment"}}}}}
    },
    "/v1/enrollments/{id}:drop": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "post": {"summary": "Drop enrollment and promote waitlist (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/DropEnrollmentResponse"}}}}}}
    },

    "/v1/events": {
      "get": {"summary": "List events (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"type": "object", "properties": {"items": {"type": "array", "items": {"$ref": "#/components/schemas/Event"}}, "total": {"type": "integer"}}}}}}},
      "post": {"summary": "Create event (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Event"}, "example": {"title": "Open House", "start": "2025-10-01T18:00:00Z", "end": "2025-10-01T20:00:00Z", "location": "Auditorium", "capacity": 100}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Event"}}}}}}
    },
    "/v1/events/{id}/registrations": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "List registrations for event (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ListEventRegistrations"}}}}}},
      "post": {"summary": "Register student for event (parent/admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/EventRegistrationRequest"}, "example": {"studentId": "s1"}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/EventRegistrationResponse"}}}}}}
    },
    "/v1/eventRegistrations/{id}:cancel": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "post": {"summary": "Cancel event registration (auth; admin or owner)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CancelEventRegistrationResponse"}, "example": {"cancelled": {"id": "er1", "eventId": "e1", "studentId": "s1", "status": "cancelled"}}}}}}}
    },

    "/v1/calendar/public": {
      "get": {
        "summary": "Public calendar of classes and events",
        "security": [],
        "parameters": [{"name": "termId", "in": "query", "required": false, "schema": {"type": "string"}}],
        "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CalendarResponse"}, "example": {"items": []}}}}}}}
    },
    "/v1/calendar/mine": {"get": {"summary": "My calendar (auth)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/CalendarResponse"}}}}, "401": {"description": "Unauthorized"}}}},

    "/v1/announcements": {"get": {"summary": "Public announcements (scope=school)", "security": [], "parameters": [{"name": "scope", "in": "query", "schema": {"type": "string", "enum": ["school", "class"]}}], "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AnnouncementList"}, "example": {"items": [{"id": "a1", "scope": "school", "title": "Welcome back!", "body": "First day is 9/1", "publishAt": "2025-08-15T00:00:00Z"}], "total": 1}}}}}}},
    "/v1/admin/announcements": {
      "get": {"summary": "List announcements (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AnnouncementList"}}}}}},
      "post": {"summary": "Create announcement (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Announcement"}, "example": {"scope": "school", "title": "Welcome back!", "body": "First day is 9/1", "publishAt": "2025-08-15T00:00:00Z"}}}}, "responses": {"201": {"description": "Created", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AnnouncementOut"}}}}}}
    },
    "/v1/admin/announcements/{id}": {
      "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
      "get": {"summary": "Get announcement (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AnnouncementOut"}}}}, "404": {"description": "Not found"}}},
      "put": {"summary": "Update announcement (admin)", "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Announcement"}}}}, "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AnnouncementOut"}}}}},
      "delete": {"summary": "Delete announcement (admin)", "responses": {"204": {"description": "No content"}}}
    },

    "/v1/reports/enrollments": {"get": {"summary": "Enrollment counts (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/EnrollmentCountsReport"}}}}}}},
    "/v1/reports/attendance": {"get": {"summary": "Attendance rates (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AttendanceRatesReport"}}}}}}},
    "/v1/reports/scores": {
      "get": {"summary": "Score summary (admin)", "parameters": [{"name": "termId", "in": "query", "schema": {"type": "string"}}], "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ScoresReport"}}}}}}
    },
    "/v1/reports/eventRegistrations": {"get": {"summary": "Event registrations (admin)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/EventRegistrationsReport"}}}}}}},

    "/v1/exports/attendance.csv": {
      "get": {"summary": "Attendance CSV (admin)", "parameters": [{"name": "classId", "in": "query", "schema": {"type": "string"}}], "responses": {"200": {"description": "CSV", "content": {"text/csv": {"schema": {"type": "string"}, "example": "classId,date,studentId,status,at\ncls1,2025-09-10,s1,present,2025-09-10T15:30:00Z"}}}}}
    },
    "/v1/exports/scores.csv": {
      "get": {"summary": "Scores CSV (admin)", "parameters": [{"name": "termId", "in": "query", "schema": {"type": "string"}}], "responses": {"200": {"description": "CSV", "content": {"text/csv": {"schema": {"type": "string"}, "example": "assessmentId,classId,studentId,value\na1,cls1,s1,95"}}}}}
    },
    "/v1/exports/eventRegistrations.csv": {
      "get": {"summary": "Event registrations CSV (admin)", "parameters": [{"name": "eventId", "in": "query", "schema": {"type": "string"}}], "responses": {"200": {"description": "CSV", "content": {"text/csv": {"schema": {"type": "string"}, "example": "eventId,studentId,status\ne1,s1,registered"}}}}}
    },

    "/v1/auth/me": {"get": {"summary": "Current principal (auth)", "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Principal"}, "example": {"id": "u1", "email": "p@example.com", "name": "Parent", "roles": ["parent"]}}}}, "401": {"description": "Unauthorized", "content": {"application/problem+json": {"schema": {"$ref": "#/components/schemas/Problem"}}}}}}
  }
}`)

// Lightweight Swagger UI page loading the OpenAPI spec from /v1/openapi.json
var swaggerDocsHTML = []byte(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>GSDTA API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/v1/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`)

func mountOpenAPI(r chi.Router) {
	r.Get("/openapi.json", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(minimalOpenAPI)
	})

	// Serve a docs page under the same router scope (e.g., /v1/docs)
	r.Get("/docs", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(swaggerDocsHTML)
	})
}
