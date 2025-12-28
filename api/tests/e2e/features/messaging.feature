Feature: Parent-Teacher Messaging API
  As a parent or teacher
  I want to send and receive messages
  So that I can communicate about student progress

  Background:
    Given the API is running

  # List Conversations Endpoint Tests

  Scenario: Unauthenticated request to list conversations is rejected
    When I send a GET request to "/api/v1/me/conversations/"
    Then the response status should be 401
    And the JSON path "code" should equal "UNAUTHORIZED"

  Scenario: Parent can list their conversations
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/me/conversations/"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.conversations" should be an array

  Scenario: Teacher can list their conversations
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/me/conversations/"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.conversations" should be an array

  Scenario: Admin can list conversations (treated as teacher)
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/me/conversations/"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.conversations" should be an array

  # Create Conversation Endpoint Tests

  Scenario: Unauthenticated request to create conversation is rejected
    When I send a POST request to "/api/v1/me/conversations/" with JSON body:
      """
      {"targetUserId": "teacher-1", "initialMessage": "Hello"}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "UNAUTHORIZED"

  Scenario: Create conversation requires target user ID
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/conversations/" with JSON body:
      """
      {"initialMessage": "Hello"}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "INVALID_REQUEST"

  Scenario: Create conversation requires initial message
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/conversations/" with JSON body:
      """
      {"targetUserId": "teacher-1"}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "INVALID_REQUEST"

  # Get Conversation Details Endpoint Tests

  Scenario: Unauthenticated request to get conversation is rejected
    When I send a GET request to "/api/v1/me/conversations/some-conv-id/"
    Then the response status should be 401
    And the JSON path "code" should equal "UNAUTHORIZED"

  Scenario: Non-participant cannot access conversation
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/me/conversations/non-participant-conv/"
    Then the response status should be 403
    And the JSON path "code" should equal "FORBIDDEN"

  # Get Messages Endpoint Tests

  Scenario: Unauthenticated request to get messages is rejected
    When I send a GET request to "/api/v1/me/conversations/some-conv-id/messages/"
    Then the response status should be 401
    And the JSON path "code" should equal "UNAUTHORIZED"

  Scenario: Non-participant cannot get messages
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/me/conversations/non-participant-conv/messages/"
    Then the response status should be 403
    And the JSON path "code" should equal "FORBIDDEN"

  # Send Message Endpoint Tests

  Scenario: Unauthenticated request to send message is rejected
    When I send a POST request to "/api/v1/me/conversations/some-conv-id/messages/" with JSON body:
      """
      {"content": "Hello"}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "UNAUTHORIZED"

  Scenario: Non-participant sending message returns forbidden
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/conversations/some-conv-id/messages/" with JSON body:
      """
      {}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "FORBIDDEN"

  Scenario: Non-participant sending empty message returns forbidden
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/conversations/some-conv-id/messages/" with JSON body:
      """
      {"content": ""}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "FORBIDDEN"

  # Mark as Read Endpoint Tests

  Scenario: Unauthenticated request to mark as read is rejected
    When I send a PATCH request to "/api/v1/me/conversations/some-conv-id/" with JSON body:
      """
      {}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "UNAUTHORIZED"

  Scenario: Non-participant cannot mark messages as read
    Given I am authenticated as a parent
    When I send a PATCH request to "/api/v1/me/conversations/non-participant-conv/" with JSON body:
      """
      {}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "FORBIDDEN"
