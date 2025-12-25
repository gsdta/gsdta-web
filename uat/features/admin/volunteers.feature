@admin @wip
Feature: Admin Volunteer Management
  As an admin
  I want to manage volunteers
  So that I can coordinate volunteer activities

  Background:
    Given I am logged in as admin

  Scenario: Admin can view volunteers list
    When I navigate to the admin volunteers page
    Then I should see the volunteers table
    And the page should load without errors

  Scenario: Admin can access volunteer management
    When I navigate to the admin volunteers page
    Then the URL should contain "/admin/volunteers"
