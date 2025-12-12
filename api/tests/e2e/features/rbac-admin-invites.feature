Feature: Admin Teacher Invites RBAC
  As a system
  I want to ensure only admins can create teacher invites
  So that role assignment is controlled

  Background:
    Given the API is running

  Scenario: Unauthenticated user cannot create teacher invite
    When I send a POST request to "/api/v1/invites" with JSON body:
      """
      {
        "email": "newteacher@gsdta.com",
        "role": "teacher"
      }
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Parent cannot create teacher invite
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/invites" with JSON body:
      """
      {
        "email": "newteacher@gsdta.com",
        "role": "teacher"
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot create teacher invite
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/invites" with JSON body:
      """
      {
        "email": "newteacher@gsdta.com",
        "role": "teacher"
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Anyone can verify an invite token (public endpoint)
    When I send a GET request to "/api/v1/invites/verify?token=test-invite-valid-123"
    Then the response status should be 200
    And the JSON path "email" should exist
    And the JSON path "role" should equal "teacher"
