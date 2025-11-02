Feature: /api/v1/me authorization

  Scenario: Missing token is unauthorized
    When I send a GET request to "/api/v1/me"
    Then the response status should be 401

