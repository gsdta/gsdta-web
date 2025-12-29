@e2e @grading-flow @wip
Feature: E2E - Academic Grading Flow
  Complete end-to-end test of assignment creation, grading, and report cards
  Tests the entire journey from assignment to parent viewing grades

  # =============================================================================
  # JOURNEY: Complete Grading Cycle
  # =============================================================================

  @smoke
  Scenario: Complete grading cycle journey
    # Step 1: Teacher creates assignment
    Given I am logged in as teacher
    And I have an assigned class with students
    When I navigate to the assignments page
    And I click "Create Assignment"
    And I fill in assignment details
      | name       | Math Quiz Week 1 |
      | type       | quiz             |
      | max_score  | 100              |
      | due_date   | next week        |
    And I save the assignment
    Then I should see a success message
    And the assignment should appear in the list

    # Step 2: Teacher posts grades
    When I navigate to the gradebook
    And I select the "Math Quiz Week 1" assignment
    And I enter grades for each student
    And I save the grades
    Then I should see a success message
    And the grades should be saved

    # Step 3: Teacher generates report card
    When I navigate to the report cards page
    And I select a student
    And I click "Generate Report Card"
    And I add teacher comments
    And I save the report card
    Then I should see the report card preview

    # Step 4: Teacher publishes report card
    When I click the publish button
    And I confirm the publication
    Then I should see a success message
    And the report card should be marked as published

    # Step 5: Parent views grades
    When I log out
    And I am logged in as parent
    When I navigate to my student's grades page
    Then I should see the "Math Quiz Week 1" grade

    # Step 6: Parent views report card
    When I navigate to my student's report cards
    Then I should see the published report card
    And I should see the grade summary
    And I should see teacher comments

  # =============================================================================
  # BULK GRADING
  # =============================================================================

  Scenario: Teacher can bulk enter grades
    Given I am logged in as teacher
    And there is an assignment for my class
    When I navigate to the gradebook
    And I select bulk entry mode
    And I enter grades for all students
    And I save all grades
    Then I should see a success message
    And all grades should be saved

  # =============================================================================
  # GRADE CALCULATIONS
  # =============================================================================

  Scenario: Grades calculate correctly
    Given I am logged in as teacher
    And I have entered multiple grades for a student
    When I view the gradebook
    Then I should see the correct average
    And I should see the weighted total
