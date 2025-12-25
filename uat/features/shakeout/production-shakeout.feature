@shakeout
Feature: Production Shakeout
  Quick validation of critical static pages after production deployment

  Scenario: Home page is accessible
    Given I am on the home page
    Then I should see the GSDTA logo
    And the page should load without errors

  Scenario: About page is accessible
    Given I navigate to "/about"
    Then the page should load without errors

  Scenario: Calendar page is accessible
    Given I navigate to "/calendar"
    Then the page should load without errors

  Scenario: Documents page is accessible
    Given I navigate to "/documents"
    Then the page should load without errors

  Scenario: Sign in page is accessible
    Given I am on the sign in page
    Then the page should load without errors
