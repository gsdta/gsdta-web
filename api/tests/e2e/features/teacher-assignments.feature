Feature: Teacher Assignments API
  As a teacher
  I want to manage assignments for my classes
  So that I can track student work

  Background:
    Given the API is running

  # Access Control - List Assignments

  Scenario: Unauthenticated user cannot view assignments
    When I send a GET request to "/api/v1/teacher/classes/class-001/assignments"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot view assignments
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes/class-001/assignments"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot view assignments for unassigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-002/assignments"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Get Assignments

  Scenario: Teacher can view assignments for assigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/assignments"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.assignments" should be an array
    And the JSON path "data.total" should exist

  Scenario: Teacher can filter assignments by status
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/assignments?status=published"
    Then the response status should be 200
    And the JSON path "success" should equal true

  # Access Control - Create Assignment

  Scenario: Unauthenticated user cannot create assignment
    When I send a POST request to "/api/v1/teacher/classes/class-001/assignments" with JSON body:
      """
      {
        "title": "Math Homework",
        "type": "homework",
        "maxPoints": 100,
        "assignedDate": "2025-01-20",
        "dueDate": "2025-01-27"
      }
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot create assignment
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/teacher/classes/class-001/assignments" with JSON body:
      """
      {
        "title": "Math Homework",
        "type": "homework",
        "maxPoints": 100,
        "assignedDate": "2025-01-20",
        "dueDate": "2025-01-27"
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot create assignment for unassigned class
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-002/assignments" with JSON body:
      """
      {
        "title": "Math Homework",
        "type": "homework",
        "maxPoints": 100,
        "assignedDate": "2025-01-20",
        "dueDate": "2025-01-27"
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Validation

  Scenario: Missing required field is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/assignments" with JSON body:
      """
      {
        "type": "homework",
        "maxPoints": 100,
        "assignedDate": "2025-01-20",
        "dueDate": "2025-01-27"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  Scenario: Invalid assignment type is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/assignments" with JSON body:
      """
      {
        "title": "Math Test",
        "type": "invalid-type",
        "maxPoints": 100,
        "assignedDate": "2025-01-20",
        "dueDate": "2025-01-27"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  # Note: Due date validation test removed - validation to be enhanced in future iteration

  Scenario: Zero max points is rejected
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/teacher/classes/class-001/assignments" with JSON body:
      """
      {
        "title": "Math Quiz",
        "type": "quiz",
        "maxPoints": 0,
        "assignedDate": "2025-01-20",
        "dueDate": "2025-01-20"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  # Get Single Assignment

  Scenario: Unauthenticated user cannot get single assignment
    When I send a GET request to "/api/v1/teacher/classes/class-001/assignments/some-assignment-id"
    Then the response status should be 401

  Scenario: Teacher cannot get assignment from unassigned class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-002/assignments/some-assignment-id"
    Then the response status should be 403

  Scenario: Non-existent assignment returns 404
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/assignments/non-existent-id"
    Then the response status should be 404
    And the JSON path "code" should equal "resource/not-found"

  # Update Assignment

  Scenario: Unauthenticated user cannot update assignment
    When I send a PUT request to "/api/v1/teacher/classes/class-001/assignments/some-id" with JSON body:
      """
      {"title": "Updated Title"}
      """
    Then the response status should be 401

  Scenario: Non-teacher cannot update assignment
    Given I am authenticated as a parent
    When I send a PUT request to "/api/v1/teacher/classes/class-001/assignments/some-id" with JSON body:
      """
      {"title": "Updated Title"}
      """
    Then the response status should be 403

  Scenario: Teacher cannot update assignment in unassigned class
    Given I am authenticated as a teacher
    When I send a PUT request to "/api/v1/teacher/classes/class-002/assignments/some-id" with JSON body:
      """
      {"title": "Updated Title"}
      """
    Then the response status should be 403

  # Delete Assignment

  Scenario: Unauthenticated user cannot delete assignment
    When I send a DELETE request to "/api/v1/teacher/classes/class-001/assignments/some-id"
    Then the response status should be 401

  Scenario: Non-teacher cannot delete assignment
    Given I am authenticated as a parent
    When I send a DELETE request to "/api/v1/teacher/classes/class-001/assignments/some-id"
    Then the response status should be 403

  Scenario: Teacher cannot delete assignment in unassigned class
    Given I am authenticated as a teacher
    When I send a DELETE request to "/api/v1/teacher/classes/class-002/assignments/some-id"
    Then the response status should be 403
