Feature: Attendance by teacher/admin

  Background:
    Given the API server is running
    And I am an admin user with id "admin1"
    # Prepare term/campus/room/class with teacher
    When I POST "/v1/terms" with body:
      """
      {"name":"Att Term"}
      """
    Then the response code should be 201
    And save json "id" as "tA"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Att Campus"}
      """
    Then the response code should be 201
    And save json "id" as "cA"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${cA}","name":"RA","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "rA"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${tA}","campusId":"${cA}","roomId":"${rA}","teacherId":"teachA","level":"L3","weekday":1,"startHHMM":"09:00","endHHMM":"10:00","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "clsA"

  Scenario: Teacher gets empty attendance then upserts records
    Given I am a teacher user with id "teachA"
    When I GET "/v1/classes/${clsA}/attendance/2025-09-10"
    Then the response code should be 200
    And the response body should contain "\"records\":[]"
    When I PUT "/v1/classes/${clsA}/attendance/2025-09-10" with body:
      """
      {"records":[{"studentId":"nonexist","status":"present"}]}
      """
    Then the response code should be 200

  Scenario: Admin mark all present with no enrollments returns empty
    Given I am an admin user with id "admin1"
    When I POST "/v1/classes/${clsA}/attendance/2025-09-11" with body:
      """
      {"records":[],"markAllPresent":true}
      """
    Then the response code should be 200

  Scenario: Other teacher forbidden
    Given I am a teacher user with id "teachOther"
    When I GET "/v1/classes/${clsA}/attendance/2025-09-10"
    Then the response code should be 403

  Scenario: Not found class returns 404
    Given I am a teacher user with id "teachA"
    When I GET "/v1/classes/badid/attendance/2025-09-10"
    Then the response code should be 404
