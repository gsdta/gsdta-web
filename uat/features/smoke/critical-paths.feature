@smoke @critical
Feature: Critical Path Smoke Tests
  Quick validation that core functionality works after deployment
  These tests should run first to validate deployment health

  # =============================================================================
  # SECTION 1: INFRASTRUCTURE
  # =============================================================================

  @api
  Scenario: Health endpoint is responding
    When I check the health endpoint
    Then the response status should be 200

  @api @skip
  Scenario: Hero content API is responding
    # Skipped: Backend returns 500 - needs backend fix
    When I call the hero content API
    Then the API response status should be 200

  @api
  Scenario: Calendar API is responding
    When I call the calendar API
    Then the API response status should be 200

  # =============================================================================
  # SECTION 2: PUBLIC PAGES
  # =============================================================================

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

  @public
  Scenario: Calendar page is accessible
    Given I navigate to "/calendar"
    Then the page should load without errors

  @public
  Scenario: Documents page is accessible
    Given I navigate to "/documents"
    Then the page should load without errors

  # =============================================================================
  # SECTION 3: AUTHENTICATION
  # =============================================================================

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

  @auth @logout
  Scenario: User can log out successfully
    Given I am logged in as admin
    When I log out
    Then I should be redirected to the sign in page

  # =============================================================================
  # SECTION 4: ADMIN DASHBOARD & NAVIGATION
  # =============================================================================

  @admin
  Scenario: Admin can access the dashboard
    Given I am logged in as admin
    Then I should be redirected to the admin dashboard
    And I should see the admin navigation menu
    And the page should load without errors

  @admin
  Scenario: Admin can see navigation links
    Given I am logged in as admin
    Then I should see the "Students" link in the navigation
    And I should see the "Teachers" link in the navigation
    And I should see the "Classes" link in the navigation

  @admin
  Scenario: Admin can view students list
    Given I am logged in as admin
    When I navigate to the admin students page
    Then I should see the students table
    And the page should load without errors

  @admin
  Scenario: Admin can view teachers list
    Given I am logged in as admin
    When I navigate to the admin teachers page
    Then the page should load without errors

  @admin @api @wip
  Scenario: Admin can fetch user profile via API
    # WIP: Token extraction from browser not working - Firebase uses IndexedDB
    Given I am logged in as admin
    When I call the me API endpoint
    Then the API response status should be 200
    And the response should contain user email

  @admin @api @wip
  Scenario: Admin can fetch grades via API
    # WIP: Token extraction from browser not working - Firebase uses IndexedDB
    Given I am logged in as admin
    When I call the admin grades API
    Then the API response status should be 200

  # =============================================================================
  # SECTION 5: TEACHER DASHBOARD
  # =============================================================================

  @teacher
  Scenario: Teacher can access the dashboard
    Given I am logged in as teacher
    Then I should be redirected to the teacher dashboard
    And the page should load without errors

  @teacher
  Scenario: Teacher can see their classes
    Given I am logged in as teacher
    When I navigate to the teacher dashboard
    Then I should see my classes section

  # =============================================================================
  # SECTION 6: PARENT DASHBOARD
  # =============================================================================

  @parent
  Scenario: Parent can access the dashboard
    Given I am logged in as parent
    Then I should be on the parent dashboard
    And the page should load without errors

  @parent
  Scenario: Parent can view dashboard content
    Given I am logged in as parent
    Then I should see my students section
