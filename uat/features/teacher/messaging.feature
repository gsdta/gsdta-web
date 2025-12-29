@teacher @messaging @wip
Feature: Teacher Parent Messaging
  As a teacher
  I want to communicate with parents
  So that I can keep them informed about their children

  Background:
    Given I am logged in as teacher

  # =============================================================================
  # SECTION 1: VIEW CONVERSATIONS
  # =============================================================================

  @smoke
  Scenario: UAT-L001 - Teacher can view conversations list
    When I navigate to the messages page
    Then I should see the conversations list
    And the page should load without errors

  Scenario: Teacher can see conversation preview
    Given there are existing conversations
    When I navigate to the messages page
    Then I should see parent names
    And I should see last message preview
    And I should see message timestamps

  # =============================================================================
  # SECTION 2: VIEW MESSAGES
  # =============================================================================

  Scenario: UAT-L002 - Teacher can view conversation thread
    Given there is a conversation with a parent
    When I click on that conversation
    Then I should see the message thread
    And I should see all messages in order

  Scenario: Teacher can see message details
    Given I am viewing a conversation thread
    Then I should see message content
    And I should see sender name
    And I should see message timestamp

  # =============================================================================
  # SECTION 3: REPLY TO MESSAGES
  # =============================================================================

  Scenario: UAT-L003 - Teacher can reply to parent message
    Given I am viewing a conversation with a parent
    When I type a reply message
    And I click the send button
    Then my message should appear in the thread
    And I should see a success indicator

  Scenario: Teacher can send long message
    Given I am viewing a conversation
    When I type a message with multiple paragraphs
    And I click the send button
    Then the message should be sent successfully

  # =============================================================================
  # SECTION 4: UNREAD INDICATORS
  # =============================================================================

  Scenario: UAT-L004 - Unread indicator displays
    Given there is an unread message from a parent
    When I navigate to the messages page
    Then I should see an unread indicator
    And the conversation should be highlighted

  Scenario: Unread indicator clears after reading
    Given there is an unread conversation
    When I click on that conversation
    And I view the messages
    Then the unread indicator should disappear
