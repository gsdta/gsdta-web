Feature: Teacher Roster API
  As a teacher
  I want to view student rosters for my assigned classes
  So that I can manage my students effectively

  Background:
    Given the API is running

  # Roster Access Control

  Scenario: Unauthenticated user cannot view roster
    When I send a GET request to "/api/v1/teacher/classes/class-001/roster"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot view roster
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes/class-001/roster"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Admin cannot access teacher roster endpoint
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/teacher/classes/class-001/roster"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot view roster for non-existent class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/non-existent-class/roster"
    Then the response status should be 404
    And the JSON path "code" should equal "class/not-found"

  Scenario: Teacher cannot view roster for class they are not assigned to
    Given I am authenticated as a teacher
    # class-002 is assigned to teacher-test-002, not test-teacher-uid
    When I send a GET request to "/api/v1/teacher/classes/class-002/roster"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Roster Data

  Scenario: Teacher can view roster for assigned class
    Given I am authenticated as a teacher
    # class-001 is assigned to test-teacher-uid with students Arun Kumar and Vikram Patel
    When I send a GET request to "/api/v1/teacher/classes/class-001/roster"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.students" should be an array
    And the JSON path "data.class.id" should equal "class-001"
    And the JSON path "data.class.name" should exist
    And the JSON path "data.class.teacherRole" should equal "primary"

  Scenario: Roster includes student details
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/roster"
    Then the response status should be 200
    And the JSON path "data.students[0].id" should exist
    And the JSON path "data.students[0].firstName" should exist
    And the JSON path "data.students[0].lastName" should exist
    And the JSON path "data.students[0].name" should exist
    And the JSON path "data.students[0].status" should exist

  Scenario: Roster can be searched by student name
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/roster?search=Arun"
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Roster can filter by student status
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/class-001/roster?status=active"
    Then the response status should be 200
    And the JSON path "success" should equal true
    When I send a GET request to "/api/v1/teacher/classes/class-001/roster?status=all"
    Then the response status should be 200
    And the JSON path "success" should equal true
