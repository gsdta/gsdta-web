@admin @wip
Feature: Admin Class Management
  As an admin
  I want to manage classes
  So that I can organize students and teachers

  Background:
    Given I am logged in as admin

  Scenario: Admin can view classes list
    When I navigate to the admin classes page
    Then I should see the classes table
    And the page should load without errors

  Scenario: Admin can access class management
    When I navigate to the admin classes page
    Then the URL should contain "/admin/classes"
