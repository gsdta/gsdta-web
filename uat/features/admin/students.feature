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
