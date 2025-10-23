Feature: Health API

  Scenario: API health check
    When I send a GET request to "/api/v1/health"
    Then the response status should be 200

