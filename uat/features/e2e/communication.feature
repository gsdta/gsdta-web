@e2e @communication @wip
Feature: E2E - Parent-Teacher Communication
  Complete end-to-end test of messaging between parents and teachers
  Tests the entire journey of a conversation from creation to resolution

  # =============================================================================
  # JOURNEY: Complete Communication Cycle
  # =============================================================================

  @smoke
  Scenario: Complete parent-teacher communication journey
    # Step 1: Parent starts conversation
    Given I am logged in as parent
    And I have a student with an assigned teacher
    When I navigate to the messages page
    And I click "New Message"
    And I select my student's teacher
    And I type a message "How is my child doing in class?"
    And I send the message
    Then I should see a success message
    And the conversation should appear in my list

    # Step 2: Teacher receives message
    When I log out
    And I am logged in as teacher
    When I navigate to the messages page
    Then I should see the new conversation
    And I should see an unread indicator

    # Step 3: Teacher views message
    When I click on the conversation
    Then I should see the parent's message
    And the unread indicator should clear

    # Step 4: Teacher replies
    When I type a reply "Your child is doing great!"
    And I send the reply
    Then my reply should appear in the thread
    And I should see a success indicator

    # Step 5: Parent receives reply
    When I log out
    And I am logged in as parent
    When I navigate to the messages page
    Then I should see an unread indicator on the conversation
    When I click on the conversation
    Then I should see the teacher's reply

    # Step 6: Parent continues conversation
    When I type "Thank you for letting me know!"
    And I send the message
    Then the message should appear in the thread

  # =============================================================================
  # MULTIPLE CONVERSATIONS
  # =============================================================================

  Scenario: Parent can have multiple conversations
    Given I am logged in as parent
    And I have multiple students with different teachers
    When I start conversations with each teacher
    Then I should see all conversations in my list
    And each conversation should be separate

  # =============================================================================
  # CONVERSATION HISTORY
  # =============================================================================

  Scenario: Conversation history is preserved
    Given there is an existing conversation with multiple messages
    When I open that conversation
    Then I should see all messages in order
    And I should see message timestamps
    And older messages should appear first
