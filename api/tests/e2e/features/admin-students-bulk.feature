Feature: Admin Student Bulk Operations API
  As an admin
  I want to bulk import and assign students
  So that I can efficiently manage large numbers of students

  Background:
    Given the API is running

  # Bulk Import Endpoint Tests

  Scenario: Unauthenticated request to bulk import is rejected
    When I send a POST request to "/api/v1/admin/students/bulk-import/" with JSON body:
      """
      {"csvData": "firstName,lastName,dateOfBirth,parentEmail\nJohn,Doe,2015-01-01,parent@test.com"}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin cannot bulk import students
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/admin/students/bulk-import/" with JSON body:
      """
      {"csvData": "firstName,lastName,dateOfBirth,parentEmail\nJohn,Doe,2015-01-01,parent@test.com"}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot bulk import students
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/admin/students/bulk-import/" with JSON body:
      """
      {"csvData": "firstName,lastName,dateOfBirth,parentEmail\nJohn,Doe,2015-01-01,parent@test.com"}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Bulk import requires CSV content
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-import/" with JSON body:
      """
      {}
      """
    Then the response status should be 400
    And the JSON path "success" should equal false

  Scenario: Bulk import validates required CSV headers
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-import/" with JSON body:
      """
      {"csvData": "firstName,lastName\nJohn,Doe"}
      """
    Then the response status should be 400
    And the JSON path "success" should equal false

  Scenario: Bulk import with valid CSV and dry run
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-import/" with JSON body:
      """
      {"csvData": "firstName,lastName,dateOfBirth,parentEmail\nJohn,Doe,2015-01-01,parent@test.com", "dryRun": true}
      """
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "dryRun" should equal true

  Scenario: Bulk import validates date of birth format
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-import/" with JSON body:
      """
      {"csvData": "firstName,lastName,dateOfBirth,parentEmail\nJohn,Doe,01-01-2015,parent@test.com", "dryRun": true}
      """
    Then the response status should be 200
    And the JSON path "invalid" should be greater than or equal to 1

  Scenario: Bulk import validates email format
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-import/" with JSON body:
      """
      {"csvData": "firstName,lastName,dateOfBirth,parentEmail\nJohn,Doe,2015-01-01,invalid-email", "dryRun": true}
      """
    Then the response status should be 200
    And the JSON path "invalid" should be greater than or equal to 1

  # Bulk Assign Class Endpoint Tests

  Scenario: Unauthenticated request to bulk assign is rejected
    When I send a POST request to "/api/v1/admin/students/bulk-assign-class/" with JSON body:
      """
      {"studentIds": ["student-1"], "classId": "class-1"}
      """
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-admin cannot bulk assign students
    Given I am authenticated as a parent
    When I send a POST request to "/api/v1/admin/students/bulk-assign-class/" with JSON body:
      """
      {"studentIds": ["student-1"], "classId": "class-1"}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot bulk assign students
    Given I am authenticated as a teacher
    When I send a POST request to "/api/v1/admin/students/bulk-assign-class/" with JSON body:
      """
      {"studentIds": ["student-1"], "classId": "class-1"}
      """
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Bulk assign requires student IDs
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-assign-class/" with JSON body:
      """
      {"classId": "class-1"}
      """
    Then the response status should be 400
    And the JSON path "success" should equal false

  Scenario: Bulk assign requires class ID
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-assign-class/" with JSON body:
      """
      {"studentIds": ["student-1"]}
      """
    Then the response status should be 400
    And the JSON path "success" should equal false

  Scenario: Bulk assign requires non-empty student IDs array
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-assign-class/" with JSON body:
      """
      {"studentIds": [], "classId": "class-1"}
      """
    Then the response status should be 400
    And the JSON path "success" should equal false

  Scenario: Bulk assign with non-existent class returns error
    Given I am authenticated as an admin
    When I send a POST request to "/api/v1/admin/students/bulk-assign-class/" with JSON body:
      """
      {"studentIds": ["student-1"], "classId": "non-existent-class"}
      """
    Then the response status should be 404
    And the JSON path "code" should equal "class/not-found"
