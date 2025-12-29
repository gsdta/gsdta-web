@e2e @teacher-onboarding @wip
Feature: E2E - Teacher Onboarding Journey
  Complete end-to-end test of teacher invitation and onboarding flow
  Tests the entire journey from admin invitation to teacher dashboard access

  # =============================================================================
  # JOURNEY: New Teacher Onboarding
  # =============================================================================

  @smoke
  Scenario: Complete teacher onboarding journey
    # Step 1: Admin creates teacher invite
    Given I am logged in as admin
    When I navigate to the teacher invite page
    And I enter a new teacher email "new.teacher@test.com"
    And I click the send invite button
    Then I should see a success message
    And an invite should be created for that email

    # Step 2: Teacher receives invite link (simulated)
    When I log out
    And I navigate to the invite verification page with valid token
    Then I should see the invite is valid
    And I should see the teacher email displayed

    # Step 3: Teacher signs in or creates account
    When I sign in as the invited teacher
    Then I should be prompted to accept the invite

    # Step 4: Teacher accepts invite
    When I click the accept invite button
    Then I should see a success message
    And my role should include teacher

    # Step 5: Teacher redirected to dashboard
    Then I should be redirected to the teacher dashboard
    And I should see the teacher navigation menu

    # Step 6: Teacher can view assigned classes
    When I navigate to the classes page
    Then I should see the classes list
    And the page should load without errors

  # =============================================================================
  # NEGATIVE CASES
  # =============================================================================

  Scenario: Expired invite token is rejected
    Given I am on the invite verification page with expired token
    Then I should see an error message
    And I should not be able to accept the invite

  Scenario: Invalid invite token is rejected
    Given I am on the invite verification page with invalid token
    Then I should see an error message
    And I should see the invite is invalid

  Scenario: Email mismatch prevents acceptance
    Given I have signed in with a different email
    And I have a valid invite token for another email
    When I try to accept the invite
    Then I should see an email mismatch error
