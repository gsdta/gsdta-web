@public
Feature: Home Page
  As a visitor
  I want to view the home page
  So that I can learn about GSDTA

  @smoke
  Scenario: Home page is accessible
    Given I am on the home page
    Then I should see the GSDTA logo
    And the page should load without errors

  Scenario: Home page has navigation
    Given I am on the home page
    Then I should see the "About" link in the navigation
    And I should see the "Calendar" link in the navigation
