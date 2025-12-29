@e2e @attendance-cycle @wip
Feature: E2E - Attendance Tracking Cycle
  Complete end-to-end test of attendance recording and viewing
  Tests the entire journey from teacher marking to parent viewing

  # =============================================================================
  # JOURNEY: Daily Attendance Flow
  # =============================================================================

  @smoke
  Scenario: Complete attendance tracking cycle
    # Step 1: Teacher marks attendance for class
    Given I am logged in as teacher
    And I have an assigned class with students
    When I navigate to the class attendance page
    And I select today's date
    And I mark half the students as present
    And I mark some students as absent
    And I mark one student as late with a note
    And I submit the attendance
    Then I should see a success message
    And the attendance should be saved

    # Step 2: Verify attendance is recorded
    When I navigate to the attendance history
    Then I should see today's attendance
    And I should see the correct counts

    # Step 3: Parent views student attendance
    When I log out
    And I am logged in as parent
    When I navigate to my student's attendance page
    Then I should see today's attendance status
    And I should see the attendance summary

    # Step 4: Admin views attendance analytics
    When I log out
    And I am logged in as admin
    When I navigate to the attendance analytics page
    Then I should see overall attendance rates
    And I should see attendance by class

  # =============================================================================
  # CHRONIC ABSENTEE DETECTION
  # =============================================================================

  Scenario: Admin identifies chronic absentees
    Given I am logged in as admin
    And there are students with poor attendance
    When I navigate to the chronic absentees report
    Then I should see students with attendance below threshold
    And I should see attendance percentages

  # =============================================================================
  # ATTENDANCE EDITING
  # =============================================================================

  Scenario: Teacher edits recent attendance
    Given I am logged in as teacher
    And I have submitted attendance for yesterday
    When I navigate to yesterday's attendance
    And I change a student from absent to present
    And I save the changes
    Then I should see a success message
    And the change should be reflected

  Scenario: Teacher cannot edit old attendance
    Given I am logged in as teacher
    And I have attendance from 10 days ago
    When I navigate to that date's attendance
    Then the attendance should be locked
    And I should not be able to make changes
