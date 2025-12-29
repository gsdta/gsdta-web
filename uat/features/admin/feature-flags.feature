@super-admin @feature-flags @wip
Feature: Feature Flags Management
  As a super admin
  I want to enable and disable features per role
  So that I can control what functionality is available

  Background:
    Given I am logged in as super admin

  # =============================================================================
  # SECTION 1: VIEW FEATURE FLAGS
  # =============================================================================

  @smoke
  Scenario: UAT-J001 - Super admin can view feature flags page
    When I navigate to the feature flags page
    Then I should see the feature flags management page
    And I should see feature toggles grouped by role
    And the page should load without errors

  Scenario: Super admin can see all role groups
    When I navigate to the feature flags page
    Then I should see the "Admin" features group
    And I should see the "Teacher" features group
    And I should see the "Parent" features group

  # =============================================================================
  # SECTION 2: TOGGLE FEATURES
  # =============================================================================

  Scenario: UAT-J002 - Super admin can toggle admin feature
    Given I am on the feature flags page
    When I toggle the "Students" feature for admin role
    Then the toggle should change state
    And I should see a save button

  Scenario: UAT-J003 - Super admin can toggle teacher feature
    Given I am on the feature flags page
    When I toggle the "Attendance" feature for teacher role
    Then the toggle should change state

  Scenario: UAT-J004 - Super admin can toggle parent feature
    Given I am on the feature flags page
    When I toggle the "Messaging" feature for parent role
    Then the toggle should change state

  Scenario: Super admin can save feature flag changes
    Given I have made feature flag changes
    When I click the save button
    Then I should see a success message
    And the changes should be persisted

  # =============================================================================
  # SECTION 3: FEATURE FLAG EFFECTS
  # =============================================================================

  Scenario: UAT-J005 - Disabled feature is hidden from navigation
    Given the "Volunteers" feature is disabled for admin role
    When I navigate to the admin dashboard
    Then I should not see the "Volunteers" link in the navigation

  Scenario: UAT-J006 - Disabled feature returns 403 on API
    Given the "Textbooks" feature is disabled for admin role
    When I try to access the textbooks API
    Then the API response status should be 403

  # =============================================================================
  # SECTION 4: AUDIT LOGGING
  # =============================================================================

  Scenario: UAT-J007 - Feature flag changes are logged
    Given I have toggled a feature flag
    And I have saved the changes
    When I navigate to the audit logs page
    Then I should see an audit log entry for the feature flag change
