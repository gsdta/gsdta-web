@admin @wip
Feature: Admin Grade Management
  As an admin
  I want to manage grades
  So that I can organize the grade structure

  Background:
    Given I am logged in as admin

  Scenario: Admin can view grades list
    When I navigate to the admin grades page
    Then I should see the grades table
    And the page should load without errors

  Scenario: Admin can access grade management
    When I navigate to the admin grades page
    Then the URL should contain "/admin/grades"
