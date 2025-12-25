@teacher @wip
Feature: Teacher Class Management
  As a teacher
  I want to view my assigned classes
  So that I can manage my teaching schedule

  Background:
    Given I am logged in as teacher

  Scenario: Teacher can view their classes
    When I navigate to the teacher classes page
    Then the URL should contain "/teacher/classes"
    And the page should load without errors
