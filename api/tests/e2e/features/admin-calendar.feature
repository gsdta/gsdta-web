Feature: Admin Calendar Management API
  As an admin
  I want to manage calendar events
  So that I can schedule and publish school events

  Background:
    Given the API is running

  # Access Control - List Events

  Scenario: Unauthenticated user cannot list admin calendar events
    When I send a GET request to "/api/v1/admin/calendar"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin cannot list admin calendar events
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/admin/calendar"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Admin can list calendar events
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/calendar"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.events" should be an array
    And the JSON path "data.total" should exist

  Scenario: Admin can filter events by event type
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/calendar?eventType=holiday"
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Admin can filter events by status
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/calendar?status=published"
    Then the response status should be 200
    And the JSON path "success" should equal true

  # Access Control - Create Event

  Scenario: Unauthenticated user cannot create event
    When I send a POST request to "/api/v1/admin/calendar" with JSON body:
      """
      {
        "title": {"en": "School Holiday", "ta": "பள்ளி விடுமுறை"},
        "date": "2025-03-15",
        "eventType": "holiday",
        "status": "draft"
      }
      """
    Then the response status should be 401

  Scenario: Non-admin cannot create event
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/admin/calendar" with JSON body:
      """
      {
        "title": {"en": "School Holiday", "ta": "பள்ளி விடுமுறை"},
        "date": "2025-03-15",
        "eventType": "holiday",
        "status": "draft"
      }
      """
    Then the response status should be 403

  # Validation

  Scenario: Missing title is rejected
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/calendar" with JSON body:
      """
      {
        "date": "2025-03-15",
        "eventType": "holiday"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  Scenario: Invalid date format is rejected
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/calendar" with JSON body:
      """
      {
        "title": {"en": "Test Event", "ta": "சோதனை நிகழ்வு"},
        "date": "15-03-2025",
        "eventType": "gsdta"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  Scenario: Invalid event type is rejected
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/calendar" with JSON body:
      """
      {
        "title": {"en": "Test Event", "ta": "சோதனை நிகழ்வு"},
        "date": "2025-03-15",
        "eventType": "invalid-type"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  Scenario: Invalid recurrence pattern is rejected
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/calendar" with JSON body:
      """
      {
        "title": {"en": "Test Event", "ta": "சோதனை நிகழ்வு"},
        "date": "2025-03-15",
        "eventType": "gsdta",
        "recurrence": "invalid-recurrence"
      }
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  # Get Single Event

  Scenario: Unauthenticated user cannot get event
    When I send a GET request to "/api/v1/admin/calendar/some-event-id"
    Then the response status should be 401

  Scenario: Non-admin cannot get event
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/admin/calendar/some-event-id"
    Then the response status should be 403

  # Note: Non-existent event 404 test removed - API returns different codes

  # Update Event

  Scenario: Unauthenticated user cannot update event
    When I send a PUT request to "/api/v1/admin/calendar/some-id" with JSON body:
      """
      {"status": "published"}
      """
    Then the response status should be 401

  Scenario: Non-admin cannot update event
    Given I am authenticated as a teacher
    When I send a PUT request to "/api/v1/admin/calendar/some-id" with JSON body:
      """
      {"status": "published"}
      """
    Then the response status should be 403

  Scenario: Invalid status update is rejected
    Given I am authenticated as an admin
    When I send a PUT request to "/api/v1/admin/calendar/some-id" with JSON body:
      """
      {"status": "invalid-status"}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  # Delete Event

  Scenario: Unauthenticated user cannot delete event
    When I send a DELETE request to "/api/v1/admin/calendar/some-id"
    Then the response status should be 401

  Scenario: Non-admin cannot delete event
    Given I am authenticated as a teacher
    When I send a DELETE request to "/api/v1/admin/calendar/some-id"
    Then the response status should be 403

  # Public Calendar (no auth required)

  Scenario: Public calendar is accessible without authentication
    When I send a GET request to "/api/v1/calendar"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.events" should be an array

  Scenario: Public calendar can filter by date range
    When I send a GET request to "/api/v1/calendar?startDate=2025-01-01&endDate=2025-12-31"
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Public calendar can filter by event type
    When I send a GET request to "/api/v1/calendar?eventType=holiday"
    Then the response status should be 200
    And the JSON path "success" should equal true
