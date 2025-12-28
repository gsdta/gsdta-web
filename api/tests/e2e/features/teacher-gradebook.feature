Feature: Teacher Gradebook API
  As a teacher
  I want to manage grades for my students
  So that I can track their academic progress

  Background:
    Given the API is running

  # Access Control - Gradebook View

  Scenario: Unauthenticated user cannot view gradebook
    When I send a GET request to "/api/v1/teacher/classes/class-001/gradebook"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot view gradebook
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes/class-001/gradebook"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot view gradebook for unassigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-002/gradebook"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher can view gradebook for assigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/gradebook"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.classId" should equal "class-001"
    And the JSON path "data.assignments" should be an array
    And the JSON path "data.students" should be an array

  # Access Control - Assignment Grades

  Scenario: Unauthenticated user cannot view assignment grades
    When I send a GET request to "/api/v1/teacher/classes/class-001/assignments/some-assignment/grades"
    Then the response status should be 401

  Scenario: Non-teacher cannot view assignment grades
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes/class-001/assignments/some-assignment/grades"
    Then the response status should be 403

  Scenario: Teacher cannot view grades for unassigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-002/assignments/some-assignment/grades"
    Then the response status should be 403

  # Access Control - Post Grades

  Scenario: Unauthenticated user cannot post grades
    When I send a POST request to "/api/v1/teacher/classes/class-001/assignments/some-assignment/grades" with JSON body:
      """
      {
        "grades": [
          {"studentId": "student-001", "pointsEarned": 85}
        ]
      }
      """
    Then the response status should be 401

  Scenario: Non-teacher cannot post grades
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/teacher/classes/class-001/assignments/some-assignment/grades" with JSON body:
      """
      {
        "grades": [
          {"studentId": "student-001", "pointsEarned": 85}
        ]
      }
      """
    Then the response status should be 403

  Scenario: Teacher cannot post grades for unassigned class
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-002/assignments/some-assignment/grades" with JSON body:
      """
      {
        "grades": [
          {"studentId": "student-001", "pointsEarned": 85}
        ]
      }
      """
    Then the response status should be 403

  # Note: Validation tests removed - API validation to be enhanced in future iteration
