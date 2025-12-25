@parent @wip
Feature: Parent Profile
  As a parent
  I want to view and update my profile
  So that my contact information is current

  Background:
    Given I am logged in as parent

  Scenario: Parent can view their profile
    When I navigate to the parent profile page
    Then the URL should contain "/parent/profile"
    And the page should load without errors
