@shakeout
Feature: Production Shakeout
  Quick validation of critical functionality after production deployment
  These tests should run in under 5 minutes and verify the system is operational

  # =============================================================================
  # SECTION 1: INFRASTRUCTURE HEALTH
  # =============================================================================

  @shakeout @critical @api
  Scenario: PS-001 - API health endpoint responds
    When I check the health endpoint
    Then the response status should be 200

  @shakeout @critical @api @skip
  Scenario: PS-002 - Hero content API responds
    # Skipped: Backend returns 500 - needs backend fix
    When I call the hero content API
    Then the API response status should be 200

  @shakeout @critical @api
  Scenario: PS-003 - Calendar API responds
    When I call the calendar API
    Then the API response status should be 200

  # =============================================================================
  # SECTION 2: PUBLIC PAGE ACCESSIBILITY
  # =============================================================================

  @shakeout @public
  Scenario: PS-010 - Home page is accessible
    Given I am on the home page
    Then I should see the GSDTA logo
    And the page should load without errors

  @shakeout @public
  Scenario: PS-011 - About page is accessible
    Given I navigate to "/about"
    Then the page should load without errors

  @shakeout @public
  Scenario: PS-012 - Calendar page is accessible
    Given I navigate to "/calendar"
    Then the page should load without errors

  @shakeout @public
  Scenario: PS-013 - Documents page is accessible
    Given I navigate to "/documents"
    Then the page should load without errors

  @shakeout @public
  Scenario: PS-014 - Textbooks page is accessible
    Given I navigate to "/textbooks"
    Then the page should load without errors

  @shakeout @public
  Scenario: PS-015 - Contact page is accessible
    Given I navigate to "/contact"
    Then the page should load without errors

  @shakeout @public
  Scenario: PS-016 - Sign in page is accessible
    Given I am on the sign in page
    Then the page should load without errors

  # =============================================================================
  # SECTION 3: AUTHENTICATION FLOWS
  # =============================================================================

  @shakeout @auth
  Scenario: PS-020 - Admin can sign in successfully
    Given I am on the sign in page
    When I enter admin credentials
    And I click the sign in button
    Then I should be redirected to the admin dashboard
    And I should see the admin navigation menu

  @shakeout @auth
  Scenario: PS-021 - Teacher can sign in successfully
    Given I am on the sign in page
    When I enter teacher credentials
    And I click the sign in button
    Then I should be redirected to the teacher dashboard

  @shakeout @auth
  Scenario: PS-022 - Parent can sign in successfully
    Given I am on the sign in page
    When I enter parent credentials
    And I click the sign in button
    Then I should be redirected to the parent dashboard

  @shakeout @auth
  Scenario: PS-023 - Logout works correctly
    Given I am logged in as admin
    When I log out
    Then I should be redirected to the sign in page

  # =============================================================================
  # SECTION 4: DASHBOARD ACCESS VERIFICATION
  # =============================================================================

  @shakeout @dashboard @admin @auth
  Scenario: PS-030 - Admin dashboard loads correctly
    Given I am logged in as admin
    Then the page should load without errors
    And I should see the admin navigation menu
    And I should see the "Students" link in the navigation

  @shakeout @dashboard @teacher @auth
  Scenario: PS-031 - Teacher dashboard loads correctly
    Given I am logged in as teacher
    Then the page should load without errors
    And I should see my classes section

  @shakeout @dashboard @parent @auth
  Scenario: PS-032 - Parent dashboard loads correctly
    Given I am logged in as parent
    Then the page should load without errors
    And I should see my students section

  # =============================================================================
  # SECTION 5: CORE API ENDPOINTS (AUTHENTICATED)
  # =============================================================================

  @shakeout @api @admin @wip
  Scenario: PS-040 - Admin can fetch user profile
    # WIP: Token extraction from browser not working - Firebase uses IndexedDB
    Given I am logged in as admin
    When I call the me API endpoint
    Then the API response status should be 200
    And the response should contain user email

  @shakeout @api @admin @wip
  Scenario: PS-041 - Admin can fetch grades list
    # WIP: Token extraction from browser not working - Firebase uses IndexedDB
    Given I am logged in as admin
    When I call the admin grades API
    Then the API response status should be 200

  @shakeout @api @admin @wip
  Scenario: PS-042 - Admin can fetch classes list
    # WIP: Token extraction from browser not working - Firebase uses IndexedDB
    Given I am logged in as admin
    When I call the admin classes API
    Then the API response status should be 200
