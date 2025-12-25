@public
Feature: Documents Page
  As a visitor
  I want to view the documents page
  So that I can access important documents

  Scenario: Documents page is accessible
    When I navigate to the documents page
    Then the URL should contain "/documents"
    And the page should load without errors
