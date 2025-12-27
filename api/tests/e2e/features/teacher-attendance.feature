Feature: Teacher Attendance API
  As a teacher
  I want to manage attendance for my classes
  So that I can track student participation

  Background:
    Given the API is running

  # Access Control - List Attendance

  Scenario: Unauthenticated user cannot view attendance
    When I send a GET request to "/api/v1/teacher/classes/class-001/attendance"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot view attendance
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes/class-001/attendance"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot view attendance for unassigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-002/attendance"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Get Attendance

  Scenario: Teacher can view attendance history for assigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/attendance"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.records" should be an array
    And the JSON path "data.total" should exist

  Scenario: Teacher can filter attendance by date
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/attendance?date=2025-01-18"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.records" should be an array

  Scenario: Teacher can filter attendance by date range
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/attendance?startDate=2025-01-01&endDate=2025-01-31"
    Then the response status should be 200
    And the JSON path "success" should equal true

  # Access Control - Mark Attendance

  Scenario: Unauthenticated user cannot mark attendance
    When I send a POST request to "/api/v1/teacher/classes/class-001/attendance" with JSON body:
      """
      {"date": "2025-01-20", "records": [{"studentId": "student-001", "status": "present"}]}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot mark attendance
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/teacher/classes/class-001/attendance" with JSON body:
      """
      {"date": "2025-01-20", "records": [{"studentId": "student-001", "status": "present"}]}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot mark attendance for unassigned class
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-002/attendance" with JSON body:
      """
      {"date": "2025-01-20", "records": [{"studentId": "student-001", "status": "present"}]}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Validation

  Scenario: Invalid date format is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/attendance" with JSON body:
      """
      {"date": "01-20-2025", "records": [{"studentId": "student-001", "status": "present"}]}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  Scenario: Future date is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/attendance" with JSON body:
      """
      {"date": "2099-12-31", "records": [{"studentId": "student-001", "status": "present"}]}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-date"

  Scenario: Invalid status is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/attendance" with JSON body:
      """
      {"date": "2025-01-20", "records": [{"studentId": "student-001", "status": "invalid"}]}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  Scenario: Empty records array is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/attendance" with JSON body:
      """
      {"date": "2025-01-20", "records": []}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  # Access Control - Update Attendance

  Scenario: Unauthenticated user cannot update attendance
    When I send a PUT request to "/api/v1/teacher/classes/class-001/attendance/some-record-id" with JSON body:
      """
      {"status": "excused"}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot update attendance
    Given I am authenticated as a parent
    When I send a PUT request to "/api/v1/teacher/classes/class-001/attendance/some-record-id" with JSON body:
      """
      {"status": "excused"}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot update attendance for unassigned class
    Given I am authenticated as a teacher
    When I send a PUT request to "/api/v1/teacher/classes/class-002/attendance/some-record-id" with JSON body:
      """
      {"status": "excused"}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot update non-existent attendance record
    Given I am authenticated as a teacher
    When I send a PUT request to "/api/v1/teacher/classes/class-001/attendance/non-existent-id" with JSON body:
      """
      {"status": "excused"}
      """
    Then the response status should be 404
    And the JSON path "code" should equal "attendance/not-found"
