@parent @wip
Feature: Parent Student View
  As a parent
  I want to view my children's information
  So that I can monitor their progress

  Background:
    Given I am logged in as parent

  Scenario: Parent can view students page
    When I navigate to the parent students page
    Then the URL should contain "/parent/students"
    And the page should load without errors
