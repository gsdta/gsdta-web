Feature: Parent Profile API
  As a parent user
  I want to manage my profile and view my linked students
  So that I can keep my information up to date

  Background:
    Given the API is running

  @parent @profile
  Scenario: Parent can get their profile
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/me"
    Then the response status should be 200
    And the JSON response should have properties:
      | uid   | string |
      | email | string |
      | name  | string |
    And the JSON path "status" should equal "active"
    And the JSON path "roles" should contain "parent"

  @parent @profile
  Scenario: Parent can update their profile
    Given I am authenticated as a parent
    When I send a PUT request to "/api/v1/me" with JSON body:
      """
      {
        "name": "Test Parent Updated",
        "phone": "555-123-4567",
        "preferredLanguage": "en",
        "notificationPreferences": {
          "email": true,
          "sms": false
        }
      }
      """
    Then the response status should be 200
    And the JSON path "name" should equal "Test Parent Updated"
    And the JSON path "phone" should equal "555-123-4567"
    And the JSON path "preferredLanguage" should equal "en"

  @parent @profile
  Scenario: Parent can update their address
    Given I am authenticated as a parent
    When I send a PUT request to "/api/v1/me" with JSON body:
      """
      {
        "address": {
          "street": "123 Test Street",
          "city": "Test City",
          "state": "TS",
          "zip": "12345"
        }
      }
      """
    Then the response status should be 200
    And the JSON path "address.street" should equal "123 Test Street"
    And the JSON path "address.city" should equal "Test City"
    And the JSON path "address.state" should equal "TS"
    And the JSON path "address.zip" should equal "12345"

  @parent @profile @validation
  Scenario: Parent profile update rejects invalid language
    Given I am authenticated as a parent
    When I send a PUT request to "/api/v1/me" with JSON body:
      """
      {
        "preferredLanguage": "invalid"
      }
      """
    Then the response status should be 400

  @parent @students
  Scenario: Parent can get linked students
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/me/students"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.students" should exist

  @parent @auth
  Scenario: Unauthenticated request to profile fails
    When I send a GET request to "/api/v1/me"
    Then the response status should be 401

  @parent @auth
  Scenario: Unauthenticated request to students fails
    When I send a GET request to "/api/v1/me/students"
    Then the response status should be 401
