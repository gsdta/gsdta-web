@teacher @gradebook @wip
Feature: Teacher Gradebook and Assignments
  As a teacher
  I want to create assignments and post grades
  So that I can track student academic progress

  Background:
    Given I am logged in as teacher

  # =============================================================================
  # SECTION 1: ASSIGNMENTS
  # =============================================================================

  @smoke
  Scenario: UAT-K009 - Teacher can create assignment
    Given I have an assigned class
    When I navigate to the assignments page
    And I click "Create Assignment"
    Then I should see the create assignment form

  Scenario: Teacher can fill assignment details
    Given I am creating a new assignment
    When I enter assignment name "Homework Week 1"
    And I select type "homework"
    And I set due date to next week
    And I set max score to 100
    Then the assignment form should be filled

  Scenario: Teacher can save assignment
    Given I have filled assignment details
    When I click the save button
    Then I should see a success message
    And the assignment should appear in the list

  Scenario: Teacher can edit assignment
    Given there is an existing assignment
    When I click edit on that assignment
    And I update the assignment name
    And I save the changes
    Then I should see a success message

  Scenario: Teacher can delete assignment
    Given there is an existing assignment
    When I click delete on that assignment
    And I confirm the deletion
    Then the assignment should be removed from the list

  # =============================================================================
  # SECTION 2: GRADEBOOK
  # =============================================================================

  Scenario: UAT-K010 - Teacher can post grades for assignment
    Given there is an assignment for my class
    When I navigate to the gradebook page
    And I select the assignment
    Then I should see the grading interface

  Scenario: Teacher can enter individual grades
    Given I am on the grading interface
    When I enter a grade for a student
    Then the grade should be displayed

  Scenario: UAT-K011 - Teacher can view gradebook matrix
    When I navigate to the gradebook page
    Then I should see the gradebook matrix
    And I should see students on rows
    And I should see assignments on columns

  Scenario: Teacher can bulk enter grades
    Given I am on the gradebook page
    When I click "Bulk Entry"
    And I enter grades for multiple students
    And I save the grades
    Then I should see a success message

  Scenario: Teacher can add feedback to grades
    Given I am on the grading interface
    When I select a student
    And I enter feedback text
    And I save the grade
    Then the feedback should be saved

  # =============================================================================
  # SECTION 3: REPORT CARDS
  # =============================================================================

  Scenario: UAT-K012 - Teacher can generate report card
    Given I have posted grades for my students
    When I navigate to the report cards page
    And I select a student
    And I click "Generate Report Card"
    Then I should see the report card preview

  Scenario: Teacher can add comments to report card
    Given I am previewing a report card
    When I add teacher comments
    Then the comments should appear in the preview

  Scenario: UAT-K013 - Teacher can publish report card
    Given I have generated a report card
    When I click the publish button
    And I confirm the publication
    Then I should see a success message
    And the report card should be marked as published

  Scenario: Parent can view published report card
    Given a report card has been published
    And I log out
    And I am logged in as parent
    When I navigate to my student's report cards
    Then I should see the published report card
