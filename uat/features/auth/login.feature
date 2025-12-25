@auth
Feature: User Login
  As a user
  I want to log in to the system
  So that I can access my role-specific features

  Background:
    Given I am on the sign in page

  @smoke
  Scenario: Admin login with valid credentials
    When I enter admin credentials
    And I click the sign in button
    Then I should be redirected to the admin dashboard
    And I should see the admin navigation menu

  @smoke
  Scenario: Teacher login with valid credentials
    When I enter teacher credentials
    And I click the sign in button
    Then I should be redirected to the teacher dashboard

  @smoke
  Scenario: Parent login with valid credentials
    When I enter parent credentials
    And I click the sign in button
    Then I should be redirected to the parent dashboard

  Scenario: Login with invalid email
    When I enter email "invalid@test.com" and password "wrongpassword"
    And I click the sign in button
    Then I should see an authentication error
    And the URL should contain "/signin"

  Scenario: Login with empty credentials
    When I click the sign in button
    Then I should see an authentication error
    And the URL should contain "/signin"
