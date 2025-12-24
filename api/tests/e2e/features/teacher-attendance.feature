@teacher @attendance
Feature: Teacher Attendance Management
  As a teacher
  I want to mark attendance for my assigned classes
  So that I can track student participation

  Background:
    Given the API is running

  # ============================================================
  # GET /api/v1/teacher/classes - Teacher's Assigned Classes
  # ============================================================

  @auth
  Scenario: Unauthenticated user cannot access teacher classes
    Given I am not authenticated
    When I send a GET request to "/api/v1/teacher/classes"
    Then the response status should be 401

  @auth
  Scenario: Parent cannot access teacher classes endpoint
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes"
    Then the response status should be 403

  @auth
  Scenario: Teacher can view their assigned classes
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.classes" should be an array

  @auth
  Scenario: Admin can view teacher classes endpoint
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/teacher/classes"
    Then the response status should be 200
    And the JSON path "success" should equal true

  # ============================================================
  # GET /api/v1/teacher/classes/:id/roster - Class Roster
  # ============================================================

  @auth
  Scenario: Unauthenticated user cannot access class roster
    Given I am not authenticated
    When I send a GET request to "/api/v1/teacher/classes/test-class-id/roster"
    Then the response status should be 401

  # ============================================================
  # GET /api/v1/teacher/classes/:id/attendance - Get Attendance
  # ============================================================

  @auth
  Scenario: Unauthenticated user cannot get attendance
    Given I am not authenticated
    When I send a GET request to "/api/v1/teacher/classes/test-class-id/attendance?date=2024-12-22"
    Then the response status should be 401

  @validation
  Scenario: Get attendance requires date parameter
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/test-class-id/attendance"
    Then the response status should be 400

  @validation
  Scenario: Get attendance validates date format
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/test-class-id/attendance?date=12-22-2024"
    Then the response status should be 400

  # ============================================================
  # POST /api/v1/teacher/classes/:id/attendance - Save Attendance
  # ============================================================

  @auth
  Scenario: Unauthenticated user cannot save attendance
    Given I am not authenticated
    When I send a POST request to "/api/v1/teacher/classes/test-class-id/attendance" with JSON body:
      """
      {
        "date": "2024-12-22",
        "records": [
          {"studentId": "s1", "status": "present"}
        ]
      }
      """
    Then the response status should be 401

  @validation
  Scenario: Save attendance requires valid date format
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/test-class-id/attendance" with JSON body:
      """
      {
        "date": "invalid-date",
        "records": [
          {"studentId": "s1", "status": "present"}
        ]
      }
      """
    Then the response status should be 400

  @validation
  Scenario: Save attendance requires non-empty records array
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/test-class-id/attendance" with JSON body:
      """
      {
        "date": "2024-12-22",
        "records": []
      }
      """
    Then the response status should be 400

  @validation
  Scenario: Save attendance validates status values
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/test-class-id/attendance" with JSON body:
      """
      {
        "date": "2024-12-22",
        "records": [
          {"studentId": "s1", "status": "invalid-status"}
        ]
      }
      """
    Then the response status should be 400
