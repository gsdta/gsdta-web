Feature: Calendar, Reports, and Exports

  Background:
    Given the API server is running

  Scenario: Public calendar returns JSON
    When I GET "/v1/calendar/public"
    Then the response code should be 200
    And the response content-type should be "application/json"

  Scenario: My calendar requires auth (negative)
    When I GET "/v1/calendar/mine"
    Then the response code should be 401

  Scenario: My calendar for parent with seed data
    Given I am a parent user with id "dev-parent"
    When I GET "/v1/calendar/mine"
    Then the response code should be 200

  Scenario: Reports admin only
    Given I am a parent user with id "dev-parent"
    When I GET "/v1/reports/enrollments"
    Then the response code should be 403
    Given I am an admin user with id "admin1"
    When I GET "/v1/reports/enrollments"
    Then the response code should be 200

  Scenario: Exports require admin and return CSV
    Given I am a parent user with id "dev-parent"
    When I GET "/v1/exports/attendance.csv"
    Then the response code should be 403
    Given I am an admin user with id "admin1"
    When I GET "/v1/exports/attendance.csv"
    Then the response code should be 200
    And the response content-type should be "text/csv"
