Feature: Teacher Classes API
  As a teacher
  I want to view my assigned classes
  So that I can manage my teaching responsibilities

  Background:
    Given the API is running

  # List Classes Endpoint Tests

  Scenario: Teacher can list their assigned classes
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes"
    Then the response status should be 200
    And the JSON response should have properties:
      | success | boolean |
      | data    | object  |
    And the JSON path "data" should have properties:
      | classes | array   |
      | total   | number  |

  Scenario: Unauthenticated user cannot list teacher classes
    When I send a GET request to "/api/v1/teacher/classes"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher user cannot access teacher classes
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Admin cannot access teacher classes endpoint
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/teacher/classes"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Individual Class Endpoint Tests

  Scenario: Unauthenticated user cannot view class details
    When I send a GET request to "/api/v1/teacher/classes/some-class-id"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot view class details
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/classes/some-class-id"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot view non-existent class
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/classes/non-existent-class-xyz"
    Then the response status should be 404
    And the JSON path "code" should equal "class/not-found"

  Scenario: Teacher cannot view class they are not assigned to
    Given I am authenticated as a teacher
    # class-002 is assigned to teacher-test-002, not test-teacher-uid
    When I send a GET request to "/api/v1/teacher/classes/class-002"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher can view class they are assigned to
    Given I am authenticated as a teacher
    # class-001 is assigned to test-teacher-uid
    When I send a GET request to "/api/v1/teacher/classes/class-001"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.class.id" should equal "class-001"
    And the JSON path "data.class.name" should exist
    And the JSON path "data.class.teacherRole" should exist
