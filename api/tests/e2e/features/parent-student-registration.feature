@parent @students @registration
Feature: Parent Student Registration
  As a parent
  I want to register my children as students
  So that they can be enrolled in Tamil classes

  Background:
    Given the API is running

  # ============================================
  # POST /api/v1/me/students - Create Student
  # ============================================

  @auth @happy-path
  Scenario: PSR-001 Parent registers a new student successfully
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Student",
        "dateOfBirth": "2015-03-15",
        "grade": "5th Grade",
        "schoolName": "Test Elementary",
        "priorTamilLevel": "beginner",
        "photoConsent": true
      }
      """
    Then the response status should be 201
    And the JSON response should have properties:
      | property | type    |
      | success  | boolean |
      | data     | object  |
    And the JSON path "data.student.status" should equal "pending"
    And the JSON path "data.student.parentId" should equal "test-parent-uid"
    And the JSON path "data.student.parentEmail" should equal "parent@test.com"

  @auth @negative
  Scenario: PSR-002 Registration fails without authentication
    Given I am not authenticated
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Student",
        "dateOfBirth": "2015-03-15"
      }
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  @auth @negative
  Scenario: PSR-003 Registration fails with teacher role
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Student",
        "dateOfBirth": "2015-03-15"
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  @auth @negative
  Scenario: PSR-004 Registration fails with admin role
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Student",
        "dateOfBirth": "2015-03-15"
      }
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  @auth @validation
  Scenario: PSR-005 Registration fails without firstName
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "lastName": "Student",
        "dateOfBirth": "2015-03-15"
      }
      """
    Then the response status should be 400
    And the JSON path "message" should contain "firstName"

  @auth @validation
  Scenario: PSR-006 Registration fails without lastName
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "dateOfBirth": "2015-03-15"
      }
      """
    Then the response status should be 400
    And the JSON path "message" should contain "lastName"

  @auth @validation
  Scenario: PSR-007 Registration fails without dateOfBirth
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Student"
      }
      """
    Then the response status should be 400
    And the JSON path "message" should contain "dateOfBirth"

  @auth @validation
  Scenario: PSR-008 Registration fails with invalid dateOfBirth format
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Student",
        "dateOfBirth": "15/03/2015"
      }
      """
    Then the response status should be 400
    And the JSON path "message" should contain "dateOfBirth"

  @auth @happy-path
  Scenario: PSR-010 Parent email is automatically captured
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Email",
        "lastName": "Capture",
        "dateOfBirth": "2015-03-15"
      }
      """
    Then the response status should be 201
    And the JSON path "data.student.parentEmail" should equal "parent@test.com"

  @auth @happy-path
  Scenario: PSR-012 PhotoConsent defaults to false
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "No",
        "lastName": "Consent",
        "dateOfBirth": "2015-03-15"
      }
      """
    Then the response status should be 201
    And the JSON path "data.student.photoConsent" should equal false

  # ============================================
  # GET /api/v1/me/students - View Own Students
  # ============================================

  @auth @happy-path
  Scenario: PSR-021 Parent sees empty array with no students
    Given I am authenticated as a parent
    And I have no registered students
    When I send a GET request to "/api/v1/me/students"
    Then the response status should be 200
    And the JSON path "data.students" should be an array
    And the JSON path "data.students" should have length 0

  @auth @negative
  Scenario: PSR-023 View students fails without auth
    Given I am not authenticated
    When I send a GET request to "/api/v1/me/students"
    Then the response status should be 401

  # ============================================
  # 2025-26 New Fields Tests
  # ============================================

  @auth @happy-path @2025-26
  Scenario: PSR-030 Parent registers student with all new fields
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Arun",
        "lastName": "Kumar",
        "dateOfBirth": "2016-03-20",
        "gender": "Boy",
        "schoolName": "Poway Elementary",
        "schoolDistrict": "Poway Unified School District",
        "grade": "3rd Grade",
        "priorTamilLevel": "beginner",
        "enrollingGrade": "grade-3",
        "address": {
          "street": "12345 Main Street",
          "city": "San Diego",
          "zipCode": "92128"
        },
        "contacts": {
          "mother": {
            "name": "Priya Kumar",
            "email": "priya@example.com",
            "phone": "8585551234",
            "employer": "Tech Corp"
          },
          "father": {
            "name": "Raj Kumar",
            "email": "raj@example.com",
            "phone": "8585555678",
            "employer": "Finance Inc"
          }
        },
        "medicalNotes": "Peanut allergy",
        "photoConsent": true
      }
      """
    Then the response status should be 201
    And the JSON path "data.student.gender" should equal "Boy"
    And the JSON path "data.student.schoolDistrict" should equal "Poway Unified School District"
    And the JSON path "data.student.address.city" should equal "San Diego"
    And the JSON path "data.student.contacts.mother.name" should equal "Priya Kumar"
    And the JSON path "data.student.contacts.father.name" should equal "Raj Kumar"
    And the JSON path "data.student.medicalNotes" should equal "Peanut allergy"

  @auth @happy-path @2025-26
  Scenario: PSR-031 Gender field accepts valid values
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Girl",
        "dateOfBirth": "2015-05-15",
        "gender": "Girl"
      }
      """
    Then the response status should be 201
    And the JSON path "data.student.gender" should equal "Girl"

  @auth @validation @2025-26
  Scenario: PSR-032 Gender field rejects invalid values
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Test",
        "lastName": "Invalid",
        "dateOfBirth": "2015-05-15",
        "gender": "InvalidGender"
      }
      """
    Then the response status should be 400
    And the JSON path "message" should contain "gender"

  @auth @happy-path @2025-26
  Scenario: PSR-033 Address fields are optional
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "No",
        "lastName": "Address",
        "dateOfBirth": "2015-05-15"
      }
      """
    Then the response status should be 201

  @auth @happy-path @2025-26
  Scenario: PSR-034 Partial address is accepted
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Partial",
        "lastName": "Address",
        "dateOfBirth": "2015-05-15",
        "address": {
          "city": "San Diego"
        }
      }
      """
    Then the response status should be 201
    And the JSON path "data.student.address.city" should equal "San Diego"

  @auth @happy-path @2025-26
  Scenario: PSR-035 Mother only contact is accepted
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Mother",
        "lastName": "Only",
        "dateOfBirth": "2015-05-15",
        "contacts": {
          "mother": {
            "name": "Single Mom",
            "email": "mom@example.com",
            "phone": "8585551234"
          }
        }
      }
      """
    Then the response status should be 201
    And the JSON path "data.student.contacts.mother.name" should equal "Single Mom"

  @auth @validation @2025-26
  Scenario: PSR-036 Invalid email in contacts is rejected
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Invalid",
        "lastName": "Email",
        "dateOfBirth": "2015-05-15",
        "contacts": {
          "mother": {
            "name": "Test Mom",
            "email": "not-an-email"
          }
        }
      }
      """
    Then the response status should be 400

  @auth @happy-path @2025-26
  Scenario: PSR-037 School district from common list is accepted
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "District",
        "lastName": "Test",
        "dateOfBirth": "2015-05-15",
        "schoolDistrict": "San Diego Unified School District"
      }
      """
    Then the response status should be 201
    And the JSON path "data.student.schoolDistrict" should equal "San Diego Unified School District"

  @auth @happy-path @2025-26
  Scenario: PSR-038 Medical notes are stored correctly
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/me/students" with JSON body:
      """
      {
        "firstName": "Medical",
        "lastName": "Notes",
        "dateOfBirth": "2015-05-15",
        "medicalNotes": "Allergic to nuts and shellfish. Has asthma."
      }
      """
    Then the response status should be 201
    And the JSON path "data.student.medicalNotes" should equal "Allergic to nuts and shellfish. Has asthma."

