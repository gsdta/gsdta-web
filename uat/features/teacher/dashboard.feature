@teacher @wip
Feature: Teacher Dashboard
  As a teacher
  I want to access my dashboard
  So that I can manage my teaching activities

  Background:
    Given I am logged in as teacher

  @smoke
  Scenario: Teacher can access the dashboard
    Then I should be redirected to the teacher dashboard
    And the page should load without errors

  Scenario: Teacher can see their classes
    When I navigate to the teacher dashboard
    Then I should see my classes section
