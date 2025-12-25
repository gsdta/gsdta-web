@smoke @critical
Feature: Critical Path Smoke Tests
  Quick validation that core functionality works after deployment
  These tests should run first to validate deployment health

  @api
  Scenario: Health endpoint is responding
    When I check the health endpoint
    Then the response status should be 200

  @public
  Scenario: Home page is accessible
    Given I am on the home page
    Then I should see the GSDTA logo
    And the page should load without errors

  @public
  Scenario: About page is accessible
    When I navigate to the about page
    Then I should see the about content
    And the page should load without errors

  @auth @login
  Scenario: Admin can log in successfully
    Given I am on the sign in page
    When I enter admin credentials
    And I click the sign in button
    Then I should be redirected to the admin dashboard
    And I should see the admin navigation menu

  @auth @login
  Scenario: Teacher can log in successfully
    Given I am on the sign in page
    When I enter teacher credentials
    And I click the sign in button
    Then I should be redirected to the teacher dashboard

  @auth @login
  Scenario: Parent can log in successfully
    Given I am on the sign in page
    When I enter parent credentials
    And I click the sign in button
    Then I should be redirected to the parent dashboard

  @admin @wip
  Scenario: Admin can view students list
    Given I am logged in as admin
    When I navigate to the admin students page
    Then I should see the students table
    And the page should load without errors

  @admin @wip
  Scenario: Admin can view teachers list
    Given I am logged in as admin
    When I navigate to the admin teachers page
    Then I should see the teachers table

  @parent @wip
  Scenario: Parent can view dashboard
    Given I am logged in as parent
    Then I should be on the parent dashboard
    And I should see my students section
