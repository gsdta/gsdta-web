Feature: Core RBAC Authentication
  As a system
  I want to enforce role-based access control
  So that users can only access authorized endpoints

  Background:
    Given the API is running

  Scenario: Public endpoints are accessible without authentication
    When I send a GET request to "/api/v1/health"
    Then the response status should be 200
    When I send a GET request to "/api/v1/hero-content"
    Then the response status should be 200

  Scenario: Protected endpoints reject unauthenticated requests
    When I send a GET request to "/api/v1/me"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Authenticated user can access /me endpoint
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/me"
    Then the response status should be 200
    And the JSON path "uid" should exist
    And the JSON path "roles" should exist

  Scenario: Admin-only endpoint rejects parent user
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/admin/teachers"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Admin-only endpoint rejects teacher user
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/admin/teachers"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Admin can access admin-only endpoints
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/teachers"
    Then the response status should be 200

  Scenario: Teacher cannot access parent endpoint (future)
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/admin/teachers"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"
