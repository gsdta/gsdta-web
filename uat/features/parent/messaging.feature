@parent @messaging @wip
Feature: Parent Teacher Messaging
  As a parent
  I want to communicate with my children's teachers
  So that I can stay informed about their progress

  Background:
    Given I am logged in as parent

  # =============================================================================
  # SECTION 1: VIEW CONVERSATIONS
  # =============================================================================

  @smoke
  Scenario: UAT-N001 - Parent can view conversations list
    When I navigate to the messages page
    Then I should see the conversations list
    And the page should load without errors

  Scenario: Parent can see conversation preview
    Given there are existing conversations
    When I navigate to the messages page
    Then I should see teacher names
    And I should see last message preview
    And I should see message timestamps

  # =============================================================================
  # SECTION 2: START NEW CONVERSATION
  # =============================================================================

  Scenario: UAT-N002 - Parent can start new conversation
    When I navigate to the messages page
    And I click "New Message"
    Then I should see the new conversation form

  Scenario: Parent can select teacher to message
    Given I am starting a new conversation
    And I have a student linked to my account
    When I select my student's teacher
    Then the teacher should be selected

  Scenario: UAT-N003 - Parent can send message to teacher
    Given I am starting a new conversation with a teacher
    When I type my message
    And I click the send button
    Then I should see a success message
    And the conversation should appear in my list

  # =============================================================================
  # SECTION 3: VIEW MESSAGES
  # =============================================================================

  Scenario: Parent can view conversation thread
    Given there is a conversation with a teacher
    When I click on that conversation
    Then I should see the message thread
    And I should see all messages in order

  Scenario: UAT-N004 - Parent can view message replies
    Given there is a conversation with replies
    When I click on that conversation
    Then I should see my messages
    And I should see teacher replies

  # =============================================================================
  # SECTION 4: REPLY TO MESSAGES
  # =============================================================================

  Scenario: Parent can reply in existing conversation
    Given I am viewing a conversation thread
    When I type a reply message
    And I click the send button
    Then my message should appear in the thread

  Scenario: Parent sees unread message indicator
    Given there is an unread message from teacher
    When I navigate to the messages page
    Then I should see an unread indicator on that conversation
