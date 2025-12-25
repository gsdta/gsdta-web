Feature: Admin Volunteers Management

  Background:
    Given the API is running
    And I am authenticated as an admin

  Scenario: Admin can list volunteers (empty initially)
    When I send a GET request to "/api/v1/admin/volunteers"
    Then the response status should be 200
    And the JSON path "data.volunteers" should be an array
    And the JSON path "data.total" should be greater than or equal to 0

  Scenario: Admin can create a high school volunteer
    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@test.com",
        "phone": "555-123-4567",
        "type": "high_school",
        "school": "Poway High School",
        "gradeLevel": "11th",
        "academicYear": "2025-2026",
        "availableDays": ["Saturday", "Sunday"],
        "notes": "Test volunteer"
      }
      """
    Then the response status should be 201
    And the JSON path "data.volunteer.id" should exist
    And the JSON path "data.volunteer.firstName" should equal "John"
    And the JSON path "data.volunteer.lastName" should equal "Doe"
    And the JSON path "data.volunteer.type" should equal "high_school"
    And the JSON path "data.volunteer.school" should equal "Poway High School"
    And the JSON path "data.volunteer.gradeLevel" should equal "11th"
    And the JSON path "data.volunteer.status" should equal "active"
    And the JSON path "data.volunteer.classAssignments" should be an array

  Scenario: Admin can create a parent volunteer
    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@test.com",
        "type": "parent",
        "academicYear": "2025-2026",
        "availableDays": ["Saturday"]
      }
      """
    Then the response status should be 201
    And the JSON path "data.volunteer.type" should equal "parent"
    And the JSON path "data.volunteer.firstName" should equal "Jane"

  Scenario: Admin can create a community volunteer
    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "Bob",
        "lastName": "Community",
        "email": "bob@community.org",
        "type": "community",
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And the JSON path "data.volunteer.type" should equal "community"

  Scenario: Admin can get a volunteer by ID
    # First create a volunteer
    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "Get",
        "lastName": "ById",
        "type": "high_school",
        "school": "Test High",
        "gradeLevel": "10th",
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And I save the JSON path "data.volunteer.id" as variable "volunteerId"

    # Then get it by ID
    When I send a GET request to "/api/v1/admin/volunteers/{volunteerId}"
    Then the response status should be 200
    And the JSON path "data.volunteer.firstName" should equal "Get"
    And the JSON path "data.volunteer.lastName" should equal "ById"

  Scenario: Admin can update a volunteer
    # First create a volunteer
    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "Update",
        "lastName": "Test",
        "type": "high_school",
        "school": "Old School",
        "gradeLevel": "9th",
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And I save the JSON path "data.volunteer.id" as variable "volunteerId"

    # Update the volunteer
    When I send a PATCH request to "/api/v1/admin/volunteers/{volunteerId}" with JSON body:
      """
      {
        "school": "New High School",
        "gradeLevel": "10th",
        "status": "inactive"
      }
      """
    Then the response status should be 200
    And the JSON path "data.volunteer.school" should equal "New High School"
    And the JSON path "data.volunteer.gradeLevel" should equal "10th"
    And the JSON path "data.volunteer.status" should equal "inactive"

  Scenario: Admin can delete a volunteer (soft delete)
    # First create a volunteer
    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "Delete",
        "lastName": "Me",
        "type": "parent",
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And I save the JSON path "data.volunteer.id" as variable "volunteerId"

    # Delete the volunteer (soft delete - sets status to inactive)
    When I send a DELETE request to "/api/v1/admin/volunteers/{volunteerId}"
    Then the response status should be 200

    # Verify it's soft-deleted (status should be inactive)
    When I send a GET request to "/api/v1/admin/volunteers/{volunteerId}"
    Then the response status should be 200
    And the JSON path "data.volunteer.status" should equal "inactive"

  Scenario: Admin can filter volunteers by type
    # Create volunteers of different types
    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "Filter",
        "lastName": "HSVolunteer",
        "type": "high_school",
        "school": "Filter Test HS",
        "gradeLevel": "12th",
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201

    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "Filter",
        "lastName": "ParentVolunteer",
        "type": "parent",
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201

    # Filter by type
    When I send a GET request to "/api/v1/admin/volunteers?type=high_school"
    Then the response status should be 200
    And the JSON path "data.volunteers" should be an array

  Scenario: Admin can filter volunteers by status
    When I send a GET request to "/api/v1/admin/volunteers?status=active"
    Then the response status should be 200
    And the JSON path "data.volunteers" should be an array

  Scenario: Validation error when creating volunteer with missing required fields
    When I send a POST request to "/api/v1/admin/volunteers" with JSON body:
      """
      {
        "firstName": "Missing"
      }
      """
    Then the response status should be 400

  Scenario: Unauthenticated user cannot access volunteers
    Given I am not authenticated
    When I send a GET request to "/api/v1/admin/volunteers"
    Then the response status should be 401
