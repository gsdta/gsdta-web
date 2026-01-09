Feature: Admin Students Management API
  As an admin
  I want to view and manage students
  So that I can oversee student registrations and updates

  Background:
    Given the API is running

  # List Students Endpoint Tests

  Scenario: Admin can list all students
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/students/"
    Then the response status should be 200
    And the JSON response should have properties:
      | success | boolean |
      | data    | object  |
    And the JSON path "data" should have properties:
      | students | array  |

  Scenario: Admin can filter students by status
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/students/?status=pending"
    Then the response status should be 200
    And the JSON path "success" should equal true
    When I send a GET request to "/api/v1/admin/students/?status=active"
    Then the response status should be 200
    And the JSON path "success" should equal true
    When I send a GET request to "/api/v1/admin/students/?status=all"
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Admin can search students
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/students/?search=test"
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Unauthenticated request to list students is rejected
    When I send a GET request to "/api/v1/admin/students/"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin user cannot list students
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/admin/students/"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Get Individual Student Endpoint Tests

  Scenario: Get student requires authentication
    When I send a GET request to "/api/v1/admin/students/some-student-id/"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin cannot get individual student
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/admin/students/some-student-id/"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Get non-existent student returns 404
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/admin/students/non-existent-student-id/"
    Then the response status should be 404
    And the JSON path "code" should equal "student/not-found"

  # Update Student Endpoint Tests (PATCH)

  Scenario: Update student requires authentication
    When I send a PATCH request to "/api/v1/admin/students/some-student-id/" with JSON body:
      """
      {"firstName": "Updated"}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin cannot update student
    Given I am authenticated as a parent
    When I send a PATCH request to "/api/v1/admin/students/some-student-id/" with JSON body:
      """
      {"firstName": "Updated"}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Update non-existent student returns 404
    Given I am authenticated as an admin
    When I send a PATCH request to "/api/v1/admin/students/non-existent-student-id/" with JSON body:
      """
      {"firstName": "Updated"}
      """
    Then the response status should be 404
    And the JSON path "code" should equal "student/not-found"

  Scenario: Update with invalid JSON is rejected
    Given I am authenticated as an admin
    When I send a PATCH request to "/api/v1/admin/students/test-student-id/" with JSON body:
      """
      not valid json
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-json"

  Scenario: Update with valid student data
    Given I am authenticated as an admin
    Given there is a student with id "test-update-student" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-update-student/" with JSON body:
      """
      {"firstName": "UpdatedName", "lastName": "UpdatedLast"}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.student.firstName" should equal "UpdatedName"
    And the JSON path "data.student.lastName" should equal "UpdatedLast"

  Scenario: Update student status
    Given I am authenticated as an admin
    Given there is a student with id "test-status-student" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-status-student/" with JSON body:
      """
      {"status": "admitted"}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.student.status" should equal "admitted"

  Scenario: Update student with invalid status is rejected
    Given I am authenticated as an admin
    Given there is a student with id "test-invalid-status" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-invalid-status/" with JSON body:
      """
      {"status": "invalid-status"}
      """
    Then the response status should be 400

  Scenario: Update student date of birth with valid format
    Given I am authenticated as an admin
    Given there is a student with id "test-dob-student" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-dob-student/" with JSON body:
      """
      {"dateOfBirth": "2016-05-15"}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.student.dateOfBirth" should equal "2016-05-15"

  Scenario: Update student date of birth with invalid format is rejected
    Given I am authenticated as an admin
    Given there is a student with id "test-invalid-dob" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-invalid-dob/" with JSON body:
      """
      {"dateOfBirth": "15-05-2016"}
      """
    Then the response status should be 400

  Scenario: Update student photo consent
    Given I am authenticated as an admin
    Given there is a student with id "test-consent-student" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-consent-student/" with JSON body:
      """
      {"photoConsent": true}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.student.photoConsent" should equal true

  Scenario: Update student medical notes
    Given I am authenticated as an admin
    Given there is a student with id "test-medical-student" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-medical-student/" with JSON body:
      """
      {"medicalNotes": "Peanut allergy"}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true

  Scenario: Update student admin notes
    Given I am authenticated as an admin
    Given there is a student with id "test-notes-student" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-notes-student/" with JSON body:
      """
      {"notes": "Internal admin notes"}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true

  # Transfer Class Endpoint Tests

  Scenario: Transfer class requires authentication
    When I send a PATCH request to "/api/v1/admin/students/some-student-id/transfer-class/" with JSON body:
      """
      {"newClassId": "class-2"}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin cannot transfer student class
    Given I am authenticated as a parent
    When I send a PATCH request to "/api/v1/admin/students/some-student-id/transfer-class/" with JSON body:
      """
      {"newClassId": "class-2"}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Transfer non-existent student returns 404
    Given I am authenticated as an admin
    When I send a PATCH request to "/api/v1/admin/students/non-existent-student/transfer-class/" with JSON body:
      """
      {"newClassId": "class-2"}
      """
    Then the response status should be 404
    And the JSON path "code" should equal "student/not-found"

  Scenario: Transfer requires newClassId
    Given I am authenticated as an admin
    Given there is an active student with id "test-transfer-student" assigned to class "class-1"
    When I send a PATCH request to "/api/v1/admin/students/test-transfer-student/transfer-class/" with JSON body:
      """
      {}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "validation/invalid-input"

  Scenario: Transfer to non-existent class returns 404
    Given I am authenticated as an admin
    Given there is an active student with id "test-transfer-notfound" assigned to class "class-1"
    When I send a PATCH request to "/api/v1/admin/students/test-transfer-notfound/transfer-class/" with JSON body:
      """
      {"newClassId": "non-existent-class"}
      """
    Then the response status should be 404
    And the JSON path "code" should equal "not-found"

  Scenario: Transfer pending student is rejected
    Given I am authenticated as an admin
    Given there is a student with id "test-transfer-pending" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-transfer-pending/transfer-class/" with JSON body:
      """
      {"newClassId": "class-2"}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "transfer/invalid"

  Scenario: Admin can transfer active student to new class
    Given I am authenticated as an admin
    Given there is an active student with id "test-transfer-success" assigned to class "class-old"
    Given there is an active class "class-new" with name "New Class" and capacity 20
    Given the class "class-old" has 5 students enrolled
    When I send a PATCH request to "/api/v1/admin/students/test-transfer-success/transfer-class/" with JSON body:
      """
      {"newClassId": "class-new"}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.student.classId" should equal "class-new"
    And the JSON path "data.newClassId" should equal "class-new"
    And the JSON path "data.previousClassId" should equal "class-old"

  # Unassign Class Endpoint Tests

  Scenario: Unassign class requires authentication
    When I send a PATCH request to "/api/v1/admin/students/some-student-id/unassign-class/" with JSON body:
      """
      {}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin cannot unassign student from class
    Given I am authenticated as a parent
    When I send a PATCH request to "/api/v1/admin/students/some-student-id/unassign-class/" with JSON body:
      """
      {}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Unassign non-existent student returns 404
    Given I am authenticated as an admin
    When I send a PATCH request to "/api/v1/admin/students/non-existent-student/unassign-class/" with JSON body:
      """
      {}
      """
    Then the response status should be 404
    And the JSON path "code" should equal "student/not-found"

  Scenario: Unassign pending student is rejected
    Given I am authenticated as an admin
    Given there is a student with id "test-unassign-pending" with status "pending"
    When I send a PATCH request to "/api/v1/admin/students/test-unassign-pending/unassign-class/" with JSON body:
      """
      {}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "unassign/invalid-status"

  Scenario: Unassign student with no class is rejected
    Given I am authenticated as an admin
    Given there is a student with id "test-unassign-noclass" with status "active"
    When I send a PATCH request to "/api/v1/admin/students/test-unassign-noclass/unassign-class/" with JSON body:
      """
      {}
      """
    Then the response status should be 400
    And the JSON path "code" should equal "unassign/not-assigned"

  Scenario: Admin can unassign active student from class
    Given I am authenticated as an admin
    Given there is an active student with id "test-unassign-success" assigned to class "class-remove"
    Given the class "class-remove" has 5 students enrolled
    When I send a PATCH request to "/api/v1/admin/students/test-unassign-success/unassign-class/" with JSON body:
      """
      {}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "message" should equal "Student unassigned from class successfully"
