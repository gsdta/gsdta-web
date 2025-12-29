@e2e @student-enrollment @wip
Feature: E2E - Student Enrollment Journey
  Complete end-to-end test of student import, admission, and class assignment
  Tests the entire journey from CSV import to class roster visibility

  # =============================================================================
  # JOURNEY: Student Bulk Enrollment
  # =============================================================================

  @smoke
  Scenario: Complete student enrollment journey via CSV import
    # Step 1: Admin imports students via CSV
    Given I am logged in as admin
    When I navigate to the student import page
    And I upload a valid student CSV file
    And I click preview
    Then I should see the import preview
    And I should see the students to be imported

    # Step 2: Admin confirms import
    When I enable "Create parent accounts"
    And I click the import button
    Then I should see the import results
    And the students should be created with pending status

    # Step 3: Admin admits pending students
    When I navigate to the students list
    And I filter by status "pending"
    And I select the newly imported students
    And I click bulk admit
    Then the students should change to active status

    # Step 4: Admin assigns students to classes
    When I navigate to the class assignment page
    And I select a class
    And I select the admitted students
    And I click assign
    Then I should see a success message
    And the students should be assigned to the class

    # Step 5: Parent can see linked students
    When I log out
    And I am logged in as parent
    When I navigate to the parent dashboard
    Then I should see my linked students

    # Step 6: Teacher can view students in roster
    When I log out
    And I am logged in as teacher
    When I navigate to my class roster
    Then I should see the newly enrolled students

  # =============================================================================
  # INDIVIDUAL SCENARIOS
  # =============================================================================

  Scenario: CSV with validation errors shows detailed feedback
    Given I am logged in as admin
    When I upload a CSV file with invalid data
    And I click preview
    Then I should see validation errors per row
    And I should be able to fix and re-upload

  Scenario: Duplicate student email is detected
    Given I am logged in as admin
    And there is an existing student with email "existing@test.com"
    When I try to import a CSV with the same email
    Then I should see a duplicate email warning
