Feature: Admin Student-Class Enrollment Management

  Background:
    Given the API is running
    And I am authenticated as an admin
    And there is a grade with id "grade-3" and name "Grade 3"
    And there is a class with id "test-class-1" for grade "grade-3" with capacity 25

  Scenario: Admin can view class roster when empty
    When I send a GET request to "/api/v1/admin/classes/test-class-1/students"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.class.id" should equal "test-class-1"
    And the JSON path "data.class.capacity" should equal 25
    And the JSON path "data.class.enrolled" should equal 0
    And the JSON path "data.students" should be an array
    And the JSON path "data.students" should have length 0

  Scenario: Admin can view class roster with students
    Given there is an admitted student with id "student-1" in grade "Grade 3"
    And student "student-1" is assigned to class "test-class-1"
    When I send a GET request to "/api/v1/admin/classes/test-class-1/students"
    Then the response status should be 200
    And the JSON path "data.students" should have length 1
    And the JSON path "data.students[0].id" should equal "student-1"
    And the JSON path "data.students[0].status" should equal "active"
    And the JSON path "data.class.enrolled" should equal 1

  Scenario: Admin can bulk assign admitted students to a class
    Given there is an admitted student with id "student-2" in grade "Grade 3"
    And there is an admitted student with id "student-3" in grade "Grade 3"
    When I send a POST request to "/api/v1/admin/classes/test-class-1/students" with JSON body:
      """
      {
        "studentIds": ["student-2", "student-3"]
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.assignedCount" should equal 2
    And the JSON path "data.class.enrolled" should equal 2
    And the JSON path "data.students" should have length 2

  Scenario: Admin cannot assign students beyond class capacity
    Given there is a class with id "small-class" for grade "grade-3" with capacity 2
    And there is an admitted student with id "student-4" in grade "Grade 3"
    And there is an admitted student with id "student-5" in grade "Grade 3"
    And there is an admitted student with id "student-6" in grade "Grade 3"
    When I send a POST request to "/api/v1/admin/classes/small-class/students" with JSON body:
      """
      {
        "studentIds": ["student-4", "student-5", "student-6"]
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal false
    And the JSON path "code" should equal "class/capacity-exceeded"

  Scenario: Admin cannot assign pending students to a class
    Given there is a pending student with id "student-7" in grade "Grade 3"
    When I send a POST request to "/api/v1/admin/classes/test-class-1/students" with JSON body:
      """
      {
        "studentIds": ["student-7"]
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal false

  Scenario: Admin can remove a student from a class
    Given there is an admitted student with id "student-8" in grade "Grade 3"
    And student "student-8" is assigned to class "test-class-1"
    When I send a DELETE request to "/api/v1/admin/classes/test-class-1/students/student-8"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.student.id" should equal "student-8"
    # Verify student is no longer in roster
    When I send a GET request to "/api/v1/admin/classes/test-class-1/students"
    Then the response status should be 200
    And the JSON path "data.class.enrolled" should equal 0
    And the JSON path "data.students" should have length 0

  Scenario: Admin cannot remove student from wrong class
    Given there is an admitted student with id "student-9" in grade "Grade 3"
    And student "student-9" is assigned to class "test-class-1"
    And there is a class with id "test-class-2" for grade "grade-3" with capacity 25
    When I send a DELETE request to "/api/v1/admin/classes/test-class-2/students/student-9"
    Then the response status should be 400
    And the JSON path "success" should equal false
    And the JSON path "code" should equal "student/not-in-class"

  Scenario: Admin cannot remove non-existent student
    When I send a DELETE request to "/api/v1/admin/classes/test-class-1/students/nonexistent"
    Then the response status should be 404
    And the JSON path "success" should equal false
    And the JSON path "code" should equal "student/not-found"

  Scenario: Enrolled count updates correctly after multiple operations
    Given there is an admitted student with id "student-10" in grade "Grade 3"
    And there is an admitted student with id "student-11" in grade "Grade 3"
    And there is an admitted student with id "student-12" in grade "Grade 3"
    # Assign 3 students
    When I send a POST request to "/api/v1/admin/classes/test-class-1/students" with JSON body:
      """
      {
        "studentIds": ["student-10", "student-11", "student-12"]
      }
      """
    Then the response status should be 200
    And the JSON path "data.class.enrolled" should equal 3
    # Remove 1 student
    When I send a DELETE request to "/api/v1/admin/classes/test-class-1/students/student-10"
    Then the response status should be 200
    # Verify count is now 2
    When I send a GET request to "/api/v1/admin/classes/test-class-1/students"
    Then the response status should be 200
    And the JSON path "data.class.enrolled" should equal 2
    And the JSON path "data.students" should have length 2

  Scenario: Admin cannot assign to inactive class
    Given there is an inactive class with id "inactive-class" for grade "grade-3"
    And there is an admitted student with id "student-13" in grade "Grade 3"
    When I send a POST request to "/api/v1/admin/classes/inactive-class/students" with JSON body:
      """
      {
        "studentIds": ["student-13"]
      }
      """
    Then the response status should be 400
    And the JSON path "success" should equal false
    And the JSON path "code" should equal "class/inactive"

  Scenario: Student status changes from admitted to active on assignment
    Given there is an admitted student with id "student-14" in grade "Grade 3"
    # Verify student is admitted
    When I send a GET request to "/api/v1/admin/students/student-14"
    Then the response status should be 200
    And the JSON path "data.student.status" should equal "admitted"
    # Assign to class
    When I send a POST request to "/api/v1/admin/classes/test-class-1/students" with JSON body:
      """
      {
        "studentIds": ["student-14"]
      }
      """
    Then the response status should be 200
    # Verify student is now active
    When I send a GET request to "/api/v1/admin/students/student-14"
    Then the response status should be 200
    And the JSON path "data.student.status" should equal "active"
    And the JSON path "data.student.classId" should equal "test-class-1"

  Scenario: Student status reverts to admitted when removed from class
    Given there is an admitted student with id "student-15" in grade "Grade 3"
    And student "student-15" is assigned to class "test-class-1"
    # Verify student is active
    When I send a GET request to "/api/v1/admin/students/student-15"
    Then the response status should be 200
    And the JSON path "data.student.status" should equal "active"
    # Remove from class
    When I send a DELETE request to "/api/v1/admin/classes/test-class-1/students/student-15"
    Then the response status should be 200
    # Verify student is now admitted
    When I send a GET request to "/api/v1/admin/students/student-15"
    Then the response status should be 200
    And the JSON path "data.student.status" should equal "admitted"
    And the JSON path "data.student.classId" should not exist
