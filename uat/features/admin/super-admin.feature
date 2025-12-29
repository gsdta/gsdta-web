@super-admin @admin @wip
Feature: Super Admin Portal
  As a super admin
  I want to manage system settings, admins, and security
  So that I can maintain the overall health of the system

  Background:
    Given I am logged in as super admin

  # =============================================================================
  # SECTION 1: SUPER ADMIN ACCESS
  # =============================================================================

  @smoke
  Scenario: UAT-I001 - Super admin can access super admin section
    When I navigate to the super admin section
    Then I should see the super admin dashboard
    And the page should load without errors

  # =============================================================================
  # SECTION 2: ADMIN USER MANAGEMENT
  # =============================================================================

  Scenario: UAT-I002 - Super admin can view all admin users
    When I navigate to the admin users page
    Then I should see the admin users table
    And I should see at least 1 admin user

  Scenario: UAT-I003 - Super admin can promote user to admin
    Given I am on the admin users page
    When I click the "Promote User" button
    And I search for a non-admin user
    And I select a user to promote
    And I confirm the promotion
    Then I should see a success message
    And the user should appear in the admin users list

  Scenario: UAT-I004 - Super admin can demote admin to regular user
    Given I am on the admin users page
    And there is a non-super-admin user in the list
    When I click the demote button for that user
    And I confirm the demotion
    Then I should see a success message
    And the user should be removed from the admin users list

  # =============================================================================
  # SECTION 3: AUDIT LOGS
  # =============================================================================

  Scenario: UAT-I005 - Super admin can view audit logs
    When I navigate to the audit logs page
    Then I should see the audit logs table
    And I should see at least 1 audit log entry

  Scenario: UAT-I006 - Super admin can filter audit logs by user
    Given I am on the audit logs page
    When I filter by user email
    Then I should see only logs for that user

  Scenario: UAT-I007 - Super admin can filter audit logs by action
    Given I am on the audit logs page
    When I filter by action type "create"
    Then I should see only create action logs

  Scenario: UAT-I008 - Super admin can export audit logs to CSV
    Given I am on the audit logs page
    When I click the export button
    Then the CSV file should be downloaded

  # =============================================================================
  # SECTION 4: SECURITY MONITORING
  # =============================================================================

  Scenario: UAT-I009 - Super admin can view security events
    When I navigate to the security events page
    Then I should see the security events dashboard
    And I should see security statistics

  Scenario: UAT-I010 - Super admin can view failed login attempts
    Given I am on the security events page
    When I filter by event type "failed_login"
    Then I should see failed login events

  # =============================================================================
  # SECTION 5: SYSTEM CONFIGURATION
  # =============================================================================

  Scenario: UAT-I010 - Super admin can enable maintenance mode
    When I navigate to the system configuration page
    Then I should see the maintenance mode toggle
    When I enable maintenance mode
    And I enter a maintenance message
    And I save the configuration
    Then I should see a success message

  Scenario: UAT-I011 - Super admin can set bilingual maintenance message
    Given I am on the system configuration page
    When I set the English maintenance message
    And I set the Tamil maintenance message
    And I save the configuration
    Then I should see a success message

  # =============================================================================
  # SECTION 6: EMERGENCY ACTIONS
  # =============================================================================

  Scenario: UAT-I012 - Super admin can suspend a user
    When I navigate to the emergency actions page
    And I search for a user to suspend
    And I select the user
    And I choose suspension severity "temporary"
    And I enter a suspension reason
    And I confirm the suspension
    Then I should see a success message
    And the user should be marked as suspended

  Scenario: UAT-I013 - Super admin can lift user suspension
    Given there is a suspended user
    When I navigate to the suspended users page
    And I click lift suspension for that user
    And I confirm lifting the suspension
    Then I should see a success message
    And the user should be removed from suspended list

  # =============================================================================
  # SECTION 7: DATA RECOVERY
  # =============================================================================

  Scenario: UAT-I014 - Super admin can view deleted data
    When I navigate to the deleted data page
    Then I should see the deleted data table
    And I should see data grouped by collection type

  Scenario: UAT-I015 - Super admin can restore deleted data
    Given there is deleted data in the system
    When I select a deleted record
    And I click the restore button
    And I confirm the restoration
    Then I should see a success message
    And the record should be removed from deleted data list

  # =============================================================================
  # SECTION 8: DATA EXPORT
  # =============================================================================

  Scenario: UAT-I016 - Super admin can export system data
    When I navigate to the data export page
    And I select export type "users"
    And I click the export button
    Then I should see the export job started
    And the export should complete within 60 seconds
