Feature: Teacher Role Invites API
  As an admin
  I want to create teacher invites
  So that teachers can accept invites and gain teacher role access

  Background:
    Given the API is running

  Scenario: Verify a valid pending invite token
    When I send a GET request to "/api/v1/invites/verify?token=test-valid-token"
    Then the response status should be 200
    And the JSON response should have properties:
      | id         | string |
      | email      | string |
      | role       | string |
      | status     | string |
      | expiresAt  | string |
    And the JSON path "role" should equal "teacher"
    And the JSON path "status" should equal "pending"

  Scenario: Verify an invalid invite token returns 404
    When I send a GET request to "/api/v1/invites/verify?token=invalid-token-xyz"
    Then the response status should be 404
    And the JSON response should have properties:
      | code    | string |
      | message | string |

  Scenario: Verify request without token returns 400
    When I send a GET request to "/api/v1/invites/verify"
    Then the response status should be 400
    And the JSON path "code" should equal "invite/invalid-token"

  # Note: Creating invites and accepting requires authentication which needs
  # proper test token infrastructure. These scenarios are deferred until auth
  # test harness is implemented.
  #
  # Future scenarios to add:
  # - Admin creates teacher invite (requires admin auth token)
  # - Teacher accepts invite (requires matching email auth token)
  # - Accept with mismatched email fails (requires auth tokens)
