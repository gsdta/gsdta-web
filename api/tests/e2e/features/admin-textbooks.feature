Feature: Admin Textbooks Management

  Background:
    Given the API is running
    And I am authenticated as an admin

  Scenario: Admin can list textbooks (empty initially)
    When I send a GET request to "/api/v1/admin/textbooks"
    Then the response status should be 200
    And the JSON path "data.textbooks" should be an array
    And the JSON path "data.total" should be greater than or equal to 0

  Scenario: Admin can create a textbook
    When I send a POST request to "/api/v1/admin/textbooks" with JSON body:
      """
      {
        "gradeId": "grade-1",
        "itemNumber": "#910131",
        "name": "Cucumber Test Textbook",
        "type": "textbook",
        "semester": "First",
        "pageCount": 100,
        "copies": 25,
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And the JSON path "data.textbook.id" should exist
    And the JSON path "data.textbook.name" should equal "Cucumber Test Textbook"
    And the JSON path "data.textbook.gradeId" should equal "grade-1"
    And the JSON path "data.textbook.itemNumber" should equal "#910131"
    And the JSON path "data.textbook.type" should equal "textbook"
    And the JSON path "data.textbook.semester" should equal "First"
    And the JSON path "data.textbook.pageCount" should equal 100
    And the JSON path "data.textbook.copies" should equal 25
    And the JSON path "data.textbook.status" should equal "active"

  Scenario: Admin can get a textbook by ID
    # First create a textbook
    When I send a POST request to "/api/v1/admin/textbooks" with JSON body:
      """
      {
        "gradeId": "grade-2",
        "itemNumber": "#920001",
        "name": "Get By ID Test",
        "type": "homework",
        "pageCount": 50,
        "copies": 30,
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And I save the JSON path "data.textbook.id" as variable "textbookId"

    # Then get it by ID
    When I send a GET request to "/api/v1/admin/textbooks/{textbookId}"
    Then the response status should be 200
    And the JSON path "data.textbook.name" should equal "Get By ID Test"
    And the JSON path "data.textbook.type" should equal "homework"

  Scenario: Admin can update a textbook
    # First create a textbook
    When I send a POST request to "/api/v1/admin/textbooks" with JSON body:
      """
      {
        "gradeId": "grade-3",
        "itemNumber": "#930001",
        "name": "Update Test Textbook",
        "type": "textbook",
        "pageCount": 75,
        "copies": 20,
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And I save the JSON path "data.textbook.id" as variable "textbookId"

    # Update the textbook
    When I send a PATCH request to "/api/v1/admin/textbooks/{textbookId}" with JSON body:
      """
      {
        "name": "Updated Textbook Name",
        "copies": 50,
        "status": "inactive"
      }
      """
    Then the response status should be 200
    And the JSON path "data.textbook.name" should equal "Updated Textbook Name"
    And the JSON path "data.textbook.copies" should equal 50
    And the JSON path "data.textbook.status" should equal "inactive"

  Scenario: Admin can delete a textbook (soft delete)
    # First create a textbook
    When I send a POST request to "/api/v1/admin/textbooks" with JSON body:
      """
      {
        "gradeId": "grade-4",
        "itemNumber": "#940001",
        "name": "Delete Test Textbook",
        "type": "textbook",
        "pageCount": 60,
        "copies": 15,
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And I save the JSON path "data.textbook.id" as variable "textbookId"

    # Delete the textbook (soft delete - sets status to inactive)
    When I send a DELETE request to "/api/v1/admin/textbooks/{textbookId}"
    Then the response status should be 200

    # Verify it's soft-deleted (status should be inactive)
    When I send a GET request to "/api/v1/admin/textbooks/{textbookId}"
    Then the response status should be 200
    And the JSON path "data.textbook.status" should equal "inactive"

  Scenario: Admin can filter textbooks by grade
    # Create textbooks for different grades
    When I send a POST request to "/api/v1/admin/textbooks" with JSON body:
      """
      {
        "gradeId": "ps-1",
        "itemNumber": "#PS1001",
        "name": "PS-1 Textbook",
        "type": "textbook",
        "pageCount": 40,
        "copies": 30,
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201

    When I send a POST request to "/api/v1/admin/textbooks" with JSON body:
      """
      {
        "gradeId": "ps-2",
        "itemNumber": "#PS2001",
        "name": "PS-2 Textbook",
        "type": "textbook",
        "pageCount": 45,
        "copies": 25,
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201

    # Filter by grade
    When I send a GET request to "/api/v1/admin/textbooks?gradeId=ps-1"
    Then the response status should be 200
    And the JSON path "data.textbooks" should be an array

  Scenario: Validation error when creating textbook with missing required fields
    When I send a POST request to "/api/v1/admin/textbooks" with JSON body:
      """
      {
        "name": "Missing Fields Textbook"
      }
      """
    Then the response status should be 400

  Scenario: Unauthenticated user cannot access textbooks
    Given I am not authenticated
    When I send a GET request to "/api/v1/admin/textbooks"
    Then the response status should be 401
