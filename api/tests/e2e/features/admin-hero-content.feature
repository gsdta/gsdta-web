Feature: Admin Hero Content Management API
  As an admin
  I want to manage hero content (event banners)
  So that I can control what appears on the homepage

  Background:
    Given the API is running

  Scenario: Admin can list all hero content
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/hero-content"
    Then the response status should be 200
    And the JSON response should have properties:
      | success | boolean |
      | data    | object  |
    And the JSON path "data" should have properties:
      | items | array |

  Scenario: Admin can filter hero content by status - active
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/hero-content?status=active"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can filter hero content by status - inactive
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/hero-content?status=inactive"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can filter hero content by status - all
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/hero-content?status=all"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can create event banner with bilingual content
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {
          "en": "Annual Day 2024",
          "ta": "ஆண்டு விழா 2024"
        },
        "subtitle": {
          "en": "Join us for the celebration",
          "ta": "கொண்டாட்டத்தில் சேருங்கள்"
        },
        "description": {
          "en": "A grand celebration event",
          "ta": "ஒரு பெரிய கொண்டாட்ட நிகழ்வு"
        },
        "priority": 10
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"
    And the JSON path "data.id" should exist

  Scenario: Admin can create event banner with image and CTA
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {
          "en": "Registration Open",
          "ta": "பதிவு திறந்துள்ளது"
        },
        "subtitle": {
          "en": "Enroll now for 2024-25",
          "ta": "2024-25 க்கு இப்போது சேருங்கள்"
        },
        "imageUrl": "https://example.com/banner.jpg",
        "ctaText": {
          "en": "Register Now",
          "ta": "இப்போது பதிவு செய்க"
        },
        "ctaLink": "https://example.com/register",
        "priority": 5
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"

  Scenario: Admin can create event banner with date range
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {
          "en": "Holiday Notice",
          "ta": "விடுமுறை அறிவிப்பு"
        },
        "subtitle": {
          "en": "School closed for holidays",
          "ta": "விடுமுறைக்காக பள்ளி மூடப்பட்டுள்ளது"
        },
        "startDate": "2024-12-20T00:00:00.000Z",
        "endDate": "2025-01-05T23:59:59.999Z",
        "priority": 8
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"

  Scenario: Creating hero content without bilingual title fails
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {
          "en": "Test Event"
        },
        "subtitle": {
          "en": "Test subtitle",
          "ta": "சோதனை"
        }
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Creating hero content without bilingual subtitle fails
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {
          "en": "Test Event",
          "ta": "சோதனை நிகழ்வு"
        },
        "subtitle": {
          "en": "Test subtitle"
        }
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Admin can update hero content
    Given I am authenticated as an admin
    And there is a hero content with id "test-hero-1"
    When I send a PATCH request to "/api/v1/admin/hero-content/test-hero-1" with JSON body:
      """
      {
        "isActive": true,
        "priority": 15
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can activate hero content
    Given I am authenticated as an admin
    And there is a hero content with id "test-hero-1"
    When I send a PATCH request to "/api/v1/admin/hero-content/test-hero-1" with JSON body:
      """
      {
        "isActive": true
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can deactivate hero content
    Given I am authenticated as an admin
    And there is a hero content with id "test-hero-1"
    When I send a PATCH request to "/api/v1/admin/hero-content/test-hero-1" with JSON body:
      """
      {
        "isActive": false
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can delete hero content
    Given I am authenticated as an admin
    And there is a hero content with id "test-hero-delete"
    When I send a DELETE request to "/api/v1/admin/hero-content/test-hero-delete"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Updating non-existent hero content fails
    Given I am authenticated as an admin
    When I send a PATCH request to "/api/v1/admin/hero-content/non-existent-id" with JSON body:
      """
      {
        "isActive": true
      }
      """
    Then the response status should be 404
    And the JSON path "code" should equal "not-found"

  Scenario: Deleting non-existent hero content fails
    Given I am authenticated as an admin
    When I send a DELETE request to "/api/v1/admin/hero-content/non-existent-id"
    Then the response status should be 404
    And the JSON path "code" should equal "not-found"

  Scenario: Unauthenticated request to list hero content is rejected
    When I send a GET request to "/api/v1/admin/hero-content"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Unauthenticated request to create hero content is rejected
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {"en": "Test", "ta": "சோதனை"},
        "subtitle": {"en": "Test", "ta": "சோதனை"}
      }
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin user cannot list hero content
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/admin/hero-content"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Non-admin user cannot create hero content
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {"en": "Test", "ta": "சோதனை"},
        "subtitle": {"en": "Test", "ta": "சோதனை"}
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Priority must be between 0 and 100
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/hero-content" with JSON body:
      """
      {
        "type": "event",
        "title": {"en": "Test", "ta": "சோதனை"},
        "subtitle": {"en": "Test", "ta": "சோதனை"},
        "priority": 150
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Public endpoint returns active hero content
    Given there is an active hero content
    When I send a GET request to "/api/v1/hero-content"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
    And the JSON path "data.content" should exist or be null

  Scenario: Public endpoint does not require authentication
    When I send a GET request to "/api/v1/hero-content"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
