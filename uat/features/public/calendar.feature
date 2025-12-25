@public
Feature: Calendar Page
  As a visitor
  I want to view the calendar page
  So that I can see upcoming events

  Scenario: Calendar page is accessible
    When I navigate to the calendar page
    Then the URL should contain "/calendar"
    And the page should load without errors
