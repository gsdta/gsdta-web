Feature: Admin Flash News Management API
  As an admin
  I want to manage flash news items
  So that I can display scrolling news on the homepage

  Background:
    Given the API is running

  # ============================================
  # List Flash News
  # ============================================

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

  # ============================================
  # Create Flash News
  # ============================================

  Scenario: Admin can create flash news with bilingual text
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Registration is now open for 2024-25!",
          "ta": "2024-25 க்கான பதிவு இப்போது திறந்துள்ளது!"
        },
        "priority": 10
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"
    And the JSON path "data.id" should exist

  Scenario: Admin can create urgent flash news
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "School closed tomorrow due to weather!",
          "ta": "வானிலை காரணமாக நாளை பள்ளி மூடப்பட்டுள்ளது!"
        },
        "isUrgent": true,
        "priority": 100
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"

  Scenario: Admin can create flash news with link
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "New academic calendar available",
          "ta": "புதிய கல்வி காலண்டர் கிடைக்கிறது"
        },
        "linkUrl": "https://example.com/calendar",
        "linkText": {
          "en": "View Calendar",
          "ta": "காலண்டரைக் காண்க"
        },
        "priority": 5
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"

  Scenario: Admin can create flash news with date range
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Holiday notice: Dec 20 - Jan 5",
          "ta": "விடுமுறை அறிவிப்பு: டிச 20 - ஜன 5"
        },
        "startDate": "2024-12-20T00:00:00.000Z",
        "endDate": "2025-01-05T23:59:59.999Z",
        "priority": 8
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"

  # ============================================
  # Validation Errors
  # ============================================

  Scenario: Creating flash news without English text fails
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "ta": "தமிழ் மட்டும்"
        }
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Creating flash news without Tamil text fails
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "English only"
        }
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Priority must be between 0 and 100
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "Test news",
          "ta": "சோதனை செய்தி"
        },
        "priority": 150
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  Scenario: Text must not exceed character limits
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {
          "en": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          "ta": "சோதனை"
        }
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal "false"

  # ============================================
  # Update Flash News
  # ============================================

  Scenario: Admin can update flash news text
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-update"
    When I send a PATCH request to "/api/v1/admin/flash-news/test-flash-update" with JSON body:
      """
      {
        "text": {
          "en": "Updated news text",
          "ta": "புதுப்பிக்கப்பட்ட செய்தி"
        }
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

  Scenario: Admin can mark flash news as urgent
    Given I am authenticated as an admin
    And there is a flash news with id "test-flash-urgent"
    When I send a PATCH request to "/api/v1/admin/flash-news/test-flash-urgent" with JSON body:
      """
      {
        "isUrgent": true,
        "priority": 100
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
    And the JSON path "code" should equal "not-found"

  # ============================================
  # Delete Flash News
  # ============================================

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
    And the JSON path "code" should equal "not-found"

  # ============================================
  # Authentication & Authorization
  # ============================================

  Scenario: Unauthenticated request to list flash news is rejected
    When I send a GET request to "/api/v1/admin/flash-news"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Unauthenticated request to create flash news is rejected
    When I send a POST request to "/api/v1/admin/flash-news" with JSON body:
      """
      {
        "text": {"en": "Test", "ta": "சோதனை"}
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
        "text": {"en": "Test", "ta": "சோதனை"}
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot manage flash news
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/admin/flash-news"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # ============================================
  # Public Endpoint
  # ============================================

  Scenario: Public endpoint returns active flash news
    Given there is an active flash news
    When I send a GET request to "/api/v1/flash-news"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
    And the JSON path "data.items" should exist

  Scenario: Public endpoint does not require authentication
    When I send a GET request to "/api/v1/flash-news"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Public endpoint respects date range filtering
    Given there is an expired flash news
    And there is an active flash news
    When I send a GET request to "/api/v1/flash-news"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
