@e2e @feature-flag-control @wip
Feature: E2E - Feature Flag Control
  Complete end-to-end test of feature flag management
  Tests the entire journey of disabling a feature and its effects

  # =============================================================================
  # JOURNEY: Feature Flag Disable/Enable Cycle
  # =============================================================================

  @smoke
  Scenario: Complete feature flag control cycle
    # Step 1: Super admin views current flags
    Given I am logged in as super admin
    When I navigate to the feature flags page
    Then I should see the feature toggles
    And the "Volunteers" feature should be enabled for admin

    # Step 2: Super admin disables feature
    When I toggle off the "Volunteers" feature for admin
    And I save the changes
    Then I should see a success message

    # Step 3: Verify feature hidden from navigation
    When I navigate to the admin dashboard
    Then I should not see the "Volunteers" link in navigation

    # Step 4: Verify API returns 403
    When I try to call the volunteers API
    Then the API response status should be 403
    And the error code should be "feature/disabled"

    # Step 5: Re-enable the feature
    When I navigate to the feature flags page
    And I toggle on the "Volunteers" feature for admin
    And I save the changes
    Then I should see a success message

    # Step 6: Verify feature is accessible again
    When I navigate to the admin dashboard
    Then I should see the "Volunteers" link in navigation
    When I call the volunteers API
    Then the API response status should be 200

  # =============================================================================
  # ROLE-SPECIFIC FLAGS
  # =============================================================================

  Scenario: Different roles have different feature visibility
    Given I am logged in as super admin
    And I have disabled "Messaging" for parent role
    And I have kept "Messaging" enabled for teacher role

    # Verify parent cannot see messaging
    When I log out
    And I am logged in as parent
    When I navigate to the parent dashboard
    Then I should not see the "Messages" link

    # Verify teacher can see messaging
    When I log out
    And I am logged in as teacher
    When I navigate to the teacher dashboard
    Then I should see the "Messages" link

  # =============================================================================
  # AUDIT LOGGING
  # =============================================================================

  Scenario: Feature flag changes are audited
    Given I am logged in as super admin
    When I toggle a feature flag
    And I save the changes
    When I navigate to the audit logs page
    Then I should see an entry for "feature_flag_update"
    And I should see my email as the actor
