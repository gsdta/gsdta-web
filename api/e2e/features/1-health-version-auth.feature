Feature: Health, Version, and Auth endpoints

  Scenario: Health check
    Given the API server is running
    When I GET "/healthz"
    Then the response code should be 200
    And the response body should contain "ok"

  Scenario: Version
    Given the API server is running
    When I GET "/v1/version"
    Then the response code should be 200
    And the response content-type should be "application/json"
    And json "version" equals "dev"

  Scenario: Auth me unauthorized
    Given the API server is running
    And I am unauthenticated
    When I GET "/v1/auth/me"
    Then the response code should be 401

  Scenario: Auth me as parent
    Given the API server is running
    And I am a parent user with id "dev-parent"
    When I GET "/v1/auth/me"
    Then the response code should be 200
    And json "roles[0]" equals "parent"

