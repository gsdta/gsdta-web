@admin @wip
Feature: Admin Student Management
  As an admin
  I want to manage students
  So that I can maintain accurate student records

  Background:
    Given I am logged in as admin

  @smoke
  Scenario: Admin can view students list
    When I navigate to the admin students page
    Then I should see the students table
    And the page should load without errors

  Scenario: Admin can access student management
    When I navigate to the admin students page
    Then the URL should contain "/admin/students"
    And I should see the students table

  # Edit Student Scenarios

  Scenario: Edit column is visible in students table
    When I navigate to the admin students page
    Then I should see the students table
    And I should see the "Edit" column header

  Scenario: Edit link navigates to edit page from table
    When I navigate to the admin students page
    Then I should see the students table
    When I click the first Edit link in the table
    Then the URL should contain "/edit"
    And I should see the "Edit Student" heading

  Scenario: Edit page displays student form sections
    When I navigate to the admin students page
    Then I should see the students table
    When I click the first Edit link in the table
    Then I should see the "Edit Student" heading
    And I should see "Basic Information" section
    And I should see "School Information" section
    And I should see "Medical & Consent" section
    And I should see "Status & Admin Notes" section

  Scenario: Edit page has Cancel and Save buttons
    When I navigate to the admin students page
    Then I should see the students table
    When I click the first Edit link in the table
    Then I should see the "Edit Student" heading
    And I should see a "Cancel" button
    And I should see a "Save Changes" button

  Scenario: Cancel button returns to student details
    When I navigate to the admin students page
    Then I should see the students table
    When I click the first Edit link in the table
    Then I should see the "Edit Student" heading
    When I click the "Cancel" button
    Then the URL should not contain "/edit"

  Scenario: Edit button visible on student detail page
    When I navigate to the admin students page
    Then I should see the students table
    When I click the first View link in the table
    Then I should see an "Edit" button

  Scenario: Edit button from detail page navigates to edit page
    When I navigate to the admin students page
    Then I should see the students table
    When I click the first View link in the table
    Then I should see an "Edit" button
    When I click the "Edit" button
    Then the URL should contain "/edit"
    And I should see the "Edit Student" heading
