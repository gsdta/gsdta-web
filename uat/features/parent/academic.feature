@parent @academic @wip
Feature: Parent Academic View
  As a parent
  I want to view my children's academic information
  So that I can monitor their progress

  Background:
    Given I am logged in as parent

  # =============================================================================
  # SECTION 1: VIEW ATTENDANCE
  # =============================================================================

  @smoke
  Scenario: UAT-O001 - Parent can view student attendance
    Given I have a linked student
    When I navigate to my student's attendance page
    Then I should see the attendance summary
    And the page should load without errors

  Scenario: Parent can see attendance statistics
    Given I am on my student's attendance page
    Then I should see attendance rate percentage
    And I should see days present
    And I should see days absent

  Scenario: Parent can see attendance calendar
    Given I am on my student's attendance page
    Then I should see a calendar view
    And I should see color-coded attendance days

  Scenario: Parent can filter attendance by date range
    Given I am on my student's attendance page
    When I select a date range
    Then I should see attendance for that period

  # =============================================================================
  # SECTION 2: VIEW GRADES
  # =============================================================================

  Scenario: UAT-O002 - Parent can view student grades
    Given I have a linked student
    When I navigate to my student's grades page
    Then I should see the grades summary
    And the page should load without errors

  Scenario: Parent can see grade by assignment
    Given I am on my student's grades page
    Then I should see assignment names
    And I should see grade scores
    And I should see grade percentages

  Scenario: Parent can see grade by subject
    Given I am on my student's grades page
    When I view by subject
    Then I should see subjects listed
    And I should see subject averages

  # =============================================================================
  # SECTION 3: VIEW REPORT CARDS
  # =============================================================================

  Scenario: UAT-O003 - Parent can view published report cards
    Given I have a linked student with a published report card
    When I navigate to my student's report cards page
    Then I should see the report card list
    And I should see published report cards

  Scenario: Parent can view report card details
    Given I am on my student's report cards page
    When I click on a report card
    Then I should see the full report card
    And I should see grades by subject
    And I should see teacher comments

  Scenario: UAT-O004 - Parent can download report card PDF
    Given I am viewing a report card
    When I click the download button
    Then the PDF should be downloaded

  Scenario: Parent cannot see unpublished report cards
    Given there is an unpublished report card for my student
    When I navigate to my student's report cards page
    Then I should not see the unpublished report card

  # =============================================================================
  # SECTION 4: MULTIPLE STUDENTS
  # =============================================================================

  Scenario: Parent with multiple students can switch views
    Given I have multiple linked students
    When I am viewing one student's academic info
    And I switch to another student
    Then I should see the other student's information
