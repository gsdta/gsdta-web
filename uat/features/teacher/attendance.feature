@teacher @attendance @wip
Feature: Teacher Attendance Management
  As a teacher
  I want to record and manage student attendance
  So that I can track student participation

  Background:
    Given I am logged in as teacher

  # =============================================================================
  # SECTION 1: VIEW ATTENDANCE
  # =============================================================================

  @smoke
  Scenario: UAT-K005 - Teacher can access attendance page
    Given I have an assigned class
    When I navigate to the class attendance page
    Then I should see the attendance interface
    And the page should load without errors

  Scenario: Teacher can see class roster for attendance
    Given I am on the attendance page for my class
    Then I should see the list of students
    And I should see attendance status options

  # =============================================================================
  # SECTION 2: MARK ATTENDANCE
  # =============================================================================

  Scenario: Teacher can mark student present
    Given I am on the attendance page for my class
    And I select today's date
    When I mark a student as "present"
    Then the student should show as present

  Scenario: Teacher can mark student absent
    Given I am on the attendance page for my class
    And I select today's date
    When I mark a student as "absent"
    Then the student should show as absent

  Scenario: Teacher can mark student late
    Given I am on the attendance page for my class
    And I select today's date
    When I mark a student as "late"
    Then the student should show as late

  Scenario: Teacher can mark student excused
    Given I am on the attendance page for my class
    And I select today's date
    When I mark a student as "excused"
    Then the student should show as excused

  Scenario: Teacher can add notes to attendance
    Given I am on the attendance page for my class
    When I add a note for a student
    Then the note should be saved

  Scenario: Teacher can submit attendance
    Given I have marked attendance for all students
    When I click the submit button
    Then I should see a success message
    And the attendance should be saved

  # =============================================================================
  # SECTION 3: EDIT ATTENDANCE
  # =============================================================================

  Scenario: UAT-K007 - Teacher can edit attendance within 7 days
    Given I have submitted attendance for a recent date
    When I navigate to that date's attendance
    And I change a student's status
    And I save the changes
    Then I should see a success message

  Scenario: Teacher cannot edit attendance older than 7 days
    Given I have submitted attendance older than 7 days
    When I navigate to that date's attendance
    Then the attendance should be read-only

  # =============================================================================
  # SECTION 4: VIEW HISTORY
  # =============================================================================

  Scenario: UAT-K008 - Teacher can view attendance history
    When I navigate to the attendance history page
    Then I should see past attendance records
    And I should see attendance statistics

  Scenario: Teacher can filter attendance by date range
    Given I am on the attendance history page
    When I select a date range
    Then I should see attendance for that period

  Scenario: Teacher can view individual student attendance
    Given I am on the attendance history page
    When I click on a student name
    Then I should see that student's attendance record
