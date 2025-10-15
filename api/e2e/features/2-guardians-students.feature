Feature: Guardians and Students CRUD with role enforcement

  Background:
    Given the API server is running

  Scenario: Parent lists only own guardians
    Given I am a parent user with id "dev-parent"
    When I GET "/v1/guardians"
    Then the response code should be 200
    And json array "items" length ">=" 1
    And the response body should contain "\"userId\":\"dev-parent\""

  Scenario: Admin creates a guardian (happy path)
    Given I am an admin user with id "admin1"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"p2","phone":"+1-555-2000"}
      """
    Then the response code should be 201
    And save json "id" as "g2"

  Scenario: Admin create guardian missing userId (negative)
    Given I am an admin user with id "admin1"
    When I POST "/v1/guardians" with body:
      """
      {"phone":"+1-555-2001"}
      """
    Then the response code should be 400

  Scenario: Parent creates a student under their guardian (happy path)
    # Find my guardian id
    Given I am a parent user with id "dev-parent"
    When I GET "/v1/guardians"
    Then the response code should be 200
    And save json "items[0].id" as "myGuardian"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${myGuardian}","firstName":"Ada","lastName":"Lovelace"}
      """
    Then the response code should be 201
    And save json "id" as "student1"

  Scenario: Parent cannot create student for other guardian (negative)
    Given I am a parent user with id "dev-parent"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"not-mine","firstName":"Alan","lastName":"Turing"}
      """
    Then the response code should be 403

  Scenario: Admin can list all students (happy path)
    Given I am an admin user with id "admin1"
    When I GET "/v1/students"
    Then the response code should be 200
    And json array "items" length ">=" 1
