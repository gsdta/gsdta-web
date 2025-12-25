@public
Feature: About Page
  As a visitor
  I want to view the about page
  So that I can learn about the organization

  @smoke
  Scenario: About page is accessible
    When I navigate to the about page
    Then I should see the about content
    And the page should load without errors

  Scenario: About page has correct URL
    When I navigate to the about page
    Then the URL should contain "/about"
