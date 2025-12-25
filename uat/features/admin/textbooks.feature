@admin @wip
Feature: Admin Textbook Management
  As an admin
  I want to manage textbooks
  So that I can maintain the curriculum materials

  Background:
    Given I am logged in as admin

  Scenario: Admin can view textbooks list
    When I navigate to the admin textbooks page
    Then I should see the textbooks table
    And the page should load without errors

  Scenario: Admin can access textbook management
    When I navigate to the admin textbooks page
    Then the URL should contain "/admin/textbooks"
