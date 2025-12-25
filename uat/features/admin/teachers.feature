@admin @wip
Feature: Admin Teacher Management
  As an admin
  I want to manage teachers
  So that I can maintain accurate teacher records

  Background:
    Given I am logged in as admin

  @smoke
  Scenario: Admin can view teachers list
    When I navigate to the admin teachers page
    Then I should see the teachers table
    And the page should load without errors

  Scenario: Admin can access teacher management
    When I navigate to the admin teachers page
    Then the URL should contain "/admin/teachers"
    And I should see the teachers table
