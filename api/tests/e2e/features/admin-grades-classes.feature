Feature: Admin Grades and Classes Management

  Background:
    Given the API is running
    And I am authenticated as an admin

  Scenario: Admin can seed default grades
    When I send a POST request to "/api/v1/admin/grades/seed" with JSON body:
      """
      {}
      """
    Then the response status should be 200
    And the JSON path "data.created" should be greater than or equal to 0

  Scenario: Admin can list grades
    When I send a GET request to "/api/v1/admin/grades"
    Then the response status should be 200
    And the JSON path "data.grades" should be an array
    And the JSON path "data.total" should be greater than or equal to 0
    # And the JSON path "data.grades[0].id" should exist

  Scenario: Admin can create a class linked to a grade
    # Create class
    When I send a POST request to "/api/v1/admin/classes" with JSON body:
      """
      {
        "name": "Cucumber Test Class",
        "gradeId": "grade-1",
        "day": "Saturday",
        "time": "10:00 AM",
        "capacity": 25,
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And the JSON path "data.class.id" should exist
    And the JSON path "data.class.gradeId" should equal "grade-1"
    And the JSON path "data.class.gradeName" should equal "Grade-1"

  Scenario: Admin can assign a teacher to a class
    # Create class first
    When I send a POST request to "/api/v1/admin/classes" with JSON body:
      """
      {
        "name": "Cucumber Teacher Class",
        "gradeId": "grade-2",
        "day": "Sunday",
        "time": "2:00 PM",
        "capacity": 20,
        "academicYear": "2025-2026"
      }
      """
    Then the response status should be 201
    And I save the JSON path "data.class.id" as variable "classId"

    # Assign teacher
    When I send a POST request to "/api/v1/admin/classes/{classId}/teachers" with JSON body:
      """
      {
        "teacherId": "teacher-123",
        "teacherName": "Test Teacher",
        "teacherEmail": "teacher@test.com",
        "role": "primary"
      }
      """
    Then the response status should be 201
    And the JSON path "data.teachers" should be an array
    And the JSON path "data.teachers[0].teacherId" should equal "teacher-123"
    And the JSON path "data.teachers[0].role" should equal "primary"
