Feature: Admin Teachers Management API
  As an admin
  I want to view and manage teachers
  So that I can oversee the teaching staff

  Background:
    Given the API is running

  Scenario: Admin can list all teachers
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/teachers"
    Then the response status should be 200
    And the JSON response should have properties:
      | success | boolean |
      | data    | object  |
    And the JSON path "data" should have properties:
      | teachers | array   |
      | total    | number  |
      | limit    | number  |
      | offset   | number  |

  Scenario: Admin can search teachers by name
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/teachers?search=test"
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Admin can filter teachers by status
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/teachers?status=active"
    Then the response status should be 200
    And the JSON path "success" should equal true
    When I send a GET request to "/api/v1/admin/teachers?status=inactive"
    Then the response status should be 200
    And the JSON path "success" should equal true
    When I send a GET request to "/api/v1/admin/teachers?status=all"
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Admin can paginate teachers list
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/teachers?limit=10&offset=0"
    Then the response status should be 200
    And the JSON path "data.limit" should equal 10
    And the JSON path "data.offset" should equal 0

  Scenario: Unauthenticated request is rejected
    When I send a GET request to "/api/v1/admin/teachers"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/unauthorized"

  Scenario: Non-admin user cannot access teachers list
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/admin/teachers"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Limit is capped at 100
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/teachers?limit=200"
    Then the response status should be 200
    And the JSON path "data.limit" should be less than or equal to 100

  Scenario: Negative offset is normalized to 0
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/teachers?offset=-10"
    Then the response status should be 200
    And the JSON path "data.offset" should equal 0

  Scenario: Combined search and filter
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/teachers?search=teacher&status=active&limit=25&offset=0"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.limit" should equal 25
    And the JSON path "data.offset" should equal 0
