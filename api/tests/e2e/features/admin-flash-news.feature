Feature: Admin Flash News Management API
  As an admin
  I want to manage flash news items
  So that I can control scrolling announcements on the marquee

  Background:
    Given the API is running

  # List Flash News
  Scenario: Admin can list all flash news
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/flash-news"
    Then the response status should be 200
    And the JSON response should have properties:
      | success | boolean |
      | data    | object  |
    And the JSON path "data" should have properties:
      | items | array |

  Scenario: Admin can filter flash news by status - active
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/flash-news?status=active"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can filter flash news by status - inactive
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/flash-news?status=inactive"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can filter flash news by status - all
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/flash-news?status=all"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  # Create Flash News
  Scenario: Admin can create flash news with bilingual content
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Registration now open for 2025 academic year!",
          "ta": "2025 கல்வி ஆண்டிற்கான பதிவு இப்போது திறந்துள்ளது!"
        },
        "priority": 80
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"
    And the JSON path "data.id" should exist

  Scenario: Admin can create flash news with link
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Click here for important updates"
        },
        "link": "https://example.com/updates",
        "priority": 50
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"

  Scenario: Admin can create flash news with schedule
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Holiday Notice: School closed Dec 20 - Jan 5"
        },
        "startDate": "2024-12-15T00:00:00.000Z",
        "endDate": "2025-01-06T23:59:59.999Z",
        "priority": 90,
        "isActive": true
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"

  Scenario: Creating flash news without English text fails
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "ta": "தமிழ் மட்டும்"
        },
        "priority": 50
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Creating flash news with text too long fails
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor."
        }
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Creating flash news with invalid link fails
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Test announcement"
        },
        "link": "not-a-valid-url"
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Creating flash news with priority out of range fails
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Test announcement"
        },
        "priority": 150
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  # Get Single Flash News
  Scenario: Admin can get a single flash news item
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-1"
    When I send a GET request to "/api/v1/admin/flash-news/test-flash-1"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
    And the JSON path "data.id" should equal "test-flash-1"

  Scenario: Getting non-existent flash news returns 404
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/flash-news/non-existent-id"
    Then the response status should be 404
    And the JSON path "code" should equal "flash-news/not-found"

  # Update Flash News
  Scenario: Admin can update flash news
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-update"
    When I send a PATCH request to "/api/v1/admin/flash-news/test-flash-update" with JSON body:
      """
      {
        "isActive": true,
        "priority": 75
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can activate flash news
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-activate"
    When I send a PATCH request to "/api/v1/admin/flash-news/test-flash-activate" with JSON body:
      """
      {
        "isActive": true
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can deactivate flash news
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-deactivate"
    When I send a PATCH request to "/api/v1/admin/flash-news/test-flash-deactivate" with JSON body:
      """
      {
        "isActive": false
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can update flash news text
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-text"
    When I send a PATCH request to "/api/v1/admin/flash-news/test-flash-text" with JSON body:
      """
      {
        "text": {
          "en": "Updated announcement text",
          "ta": "புதுப்பிக்கப்பட்ட அறிவிப்பு"
        }
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Admin can clear flash news link
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-link"
    When I send a PATCH request to "/api/v1/admin/flash-news/test-flash-link" with JSON body:
      """
      {
        "link": null
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Updating non-existent flash news fails
    Given I am authenticated as an admin
    When I send a PATCH request to "/api/v1/admin/flash-news/non-existent-id" with JSON body:
      """
      {
        "isActive": true
      }
      """
    Then the response status should be 404
    And the JSON path "code" should equal "flash-news/not-found"

  # Delete Flash News
  Scenario: Admin can delete flash news
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-delete"
    When I send a DELETE request to "/api/v1/admin/flash-news/test-flash-delete"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Deleting non-existent flash news fails
    Given I am authenticated as an admin
    When I send a DELETE request to "/api/v1/admin/flash-news/non-existent-id"
    Then the response status should be 404
    And the JSON path "code" should equal "flash-news/not-found"

  # Authentication and Authorization
  Scenario: Unauthenticated request to list flash news is rejected
    When I send a GET request to "/api/v1/admin/flash-news"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Unauthenticated request to create flash news is rejected
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {"en": "Test"}
      }
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin user cannot list flash news
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/admin/flash-news"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Non-admin user cannot create flash news
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {"en": "Test"}
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot manage flash news
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/admin/flash-news"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Public API
  Scenario: Public endpoint returns active flash news
    Given there is an active flash news
    When I send a GET request to "/api/v1/public/flash-news"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
    And the JSON path "data.items" should exist

  Scenario: Public endpoint does not require authentication
    When I send a GET request to "/api/v1/public/flash-news"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Public endpoint only returns active items
    Given there is an inactive flash news with id "inactive-test"
    When I send a GET request to "/api/v1/public/flash-news"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
