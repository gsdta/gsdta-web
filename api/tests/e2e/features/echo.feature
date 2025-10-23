Feature: Echo API

  Scenario: Echo a simple JSON object
    When I send a POST request to "/api/v1/echo" with JSON body:
      """
      {
        "message": "Hello, world!"
      }
      """
    Then the response status should be 200
    And the JSON response should have properties:
      | property  | type      |
      | echo      | object    |
      | timestamp | string    |
      | headers   | object    |
    And the JSON path "echo.message" should equal "Hello, world!"

