@parent @wip
Feature: Parent Dashboard
  As a parent
  I want to access my dashboard
  So that I can view my children's information

  Background:
    Given I am logged in as parent

  @smoke
  Scenario: Parent can access the dashboard
    Then I should be on the parent dashboard
    And the page should load without errors

  Scenario: Parent can see their students section
    Then I should see my students section
