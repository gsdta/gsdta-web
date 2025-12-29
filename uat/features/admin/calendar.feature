@admin @calendar @wip
Feature: School Calendar Management
  As an admin
  I want to manage school calendar events
  So that parents and teachers can see important dates

  Background:
    Given I am logged in as admin

  # =============================================================================
  # SECTION 1: VIEW CALENDAR
  # =============================================================================

  @smoke
  Scenario: UAT-H001 - Admin can view calendar events list
    When I navigate to the admin calendar page
    Then I should see the calendar events list
    And the page should load without errors

  Scenario: Admin can see event details in list
    When I navigate to the admin calendar page
    Then I should see event titles
    And I should see event dates
    And I should see event types

  # =============================================================================
  # SECTION 2: CREATE EVENT
  # =============================================================================

  Scenario: UAT-H002 - Admin can create new calendar event
    Given I am on the admin calendar page
    When I click the "Add Event" button
    Then I should see the create event form

  Scenario: UAT-H003 - Admin can add bilingual event
    Given I am creating a new event
    When I enter the English title "Parent Teacher Conference"
    And I enter the Tamil title "பெற்றோர் ஆசிரியர் கூட்டம்"
    And I enter the English description
    And I enter the Tamil description
    Then the bilingual fields should be filled

  Scenario: UAT-H004 - Admin can set recurring event
    Given I am creating a new event
    When I select recurrence type "weekly"
    And I select recurrence days "Saturday"
    And I set recurrence end date
    Then the recurrence settings should be configured

  Scenario: Admin can save new event
    Given I have filled all required event fields
    When I click the save button
    Then I should see a success message
    And the new event should appear in the list

  # =============================================================================
  # SECTION 3: EDIT AND DELETE EVENTS
  # =============================================================================

  Scenario: UAT-H005 - Admin can edit existing event
    Given there is an existing calendar event
    When I click the edit button for that event
    And I update the event title
    And I click the save button
    Then I should see a success message
    And the event should show the updated title

  Scenario: UAT-H006 - Admin can delete event
    Given there is an existing calendar event
    When I click the delete button for that event
    And I confirm the deletion
    Then I should see a success message
    And the event should be removed from the list

  # =============================================================================
  # SECTION 4: PUBLIC CALENDAR
  # =============================================================================

  Scenario: UAT-H007 - Event appears on public calendar
    Given there is an active calendar event
    When I navigate to the public calendar page
    Then I should see the event on the calendar
    And I should see the event title
