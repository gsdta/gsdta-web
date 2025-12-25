@auth
Feature: User Logout
  As a logged in user
  I want to log out of the system
  So that my session is terminated securely

  Scenario: Admin can logout
    Given I am logged in as admin
    When I log out
    Then I should be redirected to the sign in page

  Scenario: Teacher can logout
    Given I am logged in as teacher
    When I log out
    Then I should be redirected to the sign in page

  Scenario: Parent can logout
    Given I am logged in as parent
    When I log out
    Then I should be redirected to the sign in page
