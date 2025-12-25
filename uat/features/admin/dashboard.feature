@admin @wip
Feature: Admin Dashboard
  As an admin
  I want to access the admin dashboard
  So that I can manage the school system

  Background:
    Given I am logged in as admin

  @smoke
  Scenario: Admin can access the dashboard
    Then I should be redirected to the admin dashboard
    And I should see the admin navigation menu
    And the page should load without errors

  Scenario: Admin can see navigation links
    Then I should see the "Students" link in the navigation
    And I should see the "Teachers" link in the navigation
    And I should see the "Classes" link in the navigation
