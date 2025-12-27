Feature: Teacher Dashboard API
  As a teacher
  I want to view my dashboard
  So that I can see an overview of my classes and students

  Background:
    Given the API is running

  # Access Control

  Scenario: Unauthenticated user cannot access dashboard
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"

  Scenario: Non-teacher cannot access dashboard
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Admin cannot access teacher dashboard
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  # Dashboard Data

  Scenario: Teacher can view dashboard
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 200
    And the JSON path "success" should equal true
    And the JSON path "data.teacher" should exist
    And the JSON path "data.stats" should exist
    And the JSON path "data.classes" should be an array

  Scenario: Dashboard includes teacher info
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 200
    And the JSON path "data.teacher.uid" should exist
    And the JSON path "data.teacher.name" should exist
    And the JSON path "data.teacher.email" should exist

  Scenario: Dashboard includes stats
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 200
    And the JSON path "data.stats.totalClasses" should exist
    And the JSON path "data.stats.totalStudents" should exist
    And the JSON path "data.stats.classesToday" should exist

  Scenario: Dashboard includes class information
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 200
    And the JSON path "data.classes" should be an array
    And the JSON path "data.classes[0].id" should exist
    And the JSON path "data.classes[0].name" should exist
    And the JSON path "data.classes[0].teacherRole" should exist

  Scenario: Dashboard includes todays schedule
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 200
    And the JSON path "data.todaysSchedule" should be an array

  Scenario: Dashboard includes recent attendance
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/teacher/dashboard"
    Then the response status should be 200
    And the JSON path "data.recentAttendance" should be an array
