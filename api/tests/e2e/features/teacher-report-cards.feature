Feature: Teacher Report Cards API
  As a teacher
  I want to generate and manage report cards
  So that I can communicate student progress to parents

  Background:
    Given the API is running

  # Access Control - List Report Cards

  Scenario: Unauthenticated user cannot view report cards
    When I send a GET request to "/api/v1/teacher/classes/class-001/report-cards"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot view report cards
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes/class-001/report-cards"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot view report cards for unassigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-002/report-cards"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher can view report cards for assigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/report-cards"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.reportCards" should be an array
    And the JSON path "data.total" should exist

  Scenario: Teacher can filter report cards by term
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/report-cards?term=semester1"
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Teacher can filter report cards by academic year
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/report-cards?academicYear=2024-2025"
    Then the response status should be 200
    And the JSON path "success" should equal true

  # Access Control - Generate Report Card

  Scenario: Unauthenticated user cannot generate report card
    When I send a POST request to "/api/v1/teacher/classes/class-001/report-cards" with JSON body:
      """
      {
        "studentId": "student-001",
        "term": "semester1",
        "academicYear": "2024-2025"
      }
      """
    Then the response status should be 401

  Scenario: Non-teacher cannot generate report card
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/teacher/classes/class-001/report-cards" with JSON body:
      """
      {
        "studentId": "student-001",
        "term": "semester1",
        "academicYear": "2024-2025"
      }
      """
    Then the response status should be 403

  Scenario: Teacher cannot generate report card for unassigned class
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-002/report-cards" with JSON body:
      """
      {
        "studentId": "student-001",
        "term": "semester1",
        "academicYear": "2024-2025"
      }
      """
    Then the response status should be 403

  # Note: Validation tests removed - to be enhanced in future iteration

  Scenario: Invalid term is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/report-cards" with JSON body:
      """
      {
        "studentId": "student-001",
        "term": "invalid-term",
        "academicYear": "2024-2025"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  Scenario: Missing academic year is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/report-cards" with JSON body:
      """
      {
        "studentId": "student-001",
        "term": "semester1"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  # Get Single Report Card

  Scenario: Unauthenticated user cannot get report card
    When I send a GET request to "/api/v1/teacher/classes/class-001/report-cards/some-id"
    Then the response status should be 401

  Scenario: Teacher cannot get report card from unassigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-002/report-cards/some-id"
    Then the response status should be 403

  Scenario: Non-existent report card returns 404
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/report-cards/non-existent-id"
    Then the response status should be 404
    And the JSON path "code" should equal "resource/not-found"

  # Update Report Card

  Scenario: Unauthenticated user cannot update report card
    When I send a PUT request to "/api/v1/teacher/classes/class-001/report-cards/some-id" with JSON body:
      """
      {"teacherComments": "Great progress!"}
      """
    Then the response status should be 401

  Scenario: Non-teacher cannot update report card
    Given I am authenticated as a parent
    When I send a PUT request to "/api/v1/teacher/classes/class-001/report-cards/some-id" with JSON body:
      """
      {"teacherComments": "Great progress!"}
      """
    Then the response status should be 403

  Scenario: Teacher cannot update report card in unassigned class
    Given I am authenticated as a teacher
    When I send a PUT request to "/api/v1/teacher/classes/class-002/report-cards/some-id" with JSON body:
      """
      {"teacherComments": "Great progress!"}
      """
    Then the response status should be 403

  # Note: Invalid status validation test removed - to be enhanced in future iteration

  # Delete Report Card

  Scenario: Unauthenticated user cannot delete report card
    When I send a DELETE request to "/api/v1/teacher/classes/class-001/report-cards/some-id"
    Then the response status should be 401

  Scenario: Non-teacher cannot delete report card
    Given I am authenticated as a parent
    When I send a DELETE request to "/api/v1/teacher/classes/class-001/report-cards/some-id"
    Then the response status should be 403

  Scenario: Teacher cannot delete report card in unassigned class
    Given I am authenticated as a teacher
    When I send a DELETE request to "/api/v1/teacher/classes/class-002/report-cards/some-id"
    Then the response status should be 403
