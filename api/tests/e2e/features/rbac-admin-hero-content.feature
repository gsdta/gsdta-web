Feature: Admin Hero Content RBAC
  As a system
  I want to ensure only admins can manage hero content
  So that website content is controlled

  Background:
    Given the API is running

  Scenario: Public can view hero content (read-only)
    When I send a GET request to "/api/v1/hero-content"
    Then the response status should be 200

  Scenario: Unauthenticated user cannot list admin hero content
    When I send a GET request to "/api/v1/admin/hero-content"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Parent cannot list admin hero content
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/admin/hero-content"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot list admin hero content
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/admin/hero-content"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Admin can list hero content
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/hero-content"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data" should exist

  Scenario: Parent cannot create hero content
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {"en": "Test Event", "ta": "சோதனை நிகழ்வு"},
        "subtitle": {"en": "Test", "ta": "சோதனை"}
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot create hero content
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {"en": "Test Event", "ta": "சோதனை நிகழ்வு"},
        "subtitle": {"en": "Test", "ta": "சோதனை"}
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"
