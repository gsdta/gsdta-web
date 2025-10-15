Feature: Enrollments workflow

  Background:
    Given the API server is running

  Scenario: Public apply missing fields (negative)
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"","classId":"some"}
      """
    Then the response code should be 400

  Scenario: Apply, waitlist, setStatus conflict, and drop promotion
    Given I am an admin user with id "admin1"
    # Setup term/campus/room/class capacity 1
    When I POST "/v1/terms" with body:
      """
      {"name":"Enroll Term"}
      """
    Then the response code should be 201
    And save json "id" as "te"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Enroll Campus"}
      """
    Then the response code should be 201
    And save json "id" as "ce"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${ce}","name":"ER","capacity":2}
      """
    Then the response code should be 201
    And save json "id" as "re"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${te}","campusId":"${ce}","roomId":"${re}","teacherId":"teachE","level":"L2","weekday":3,"startHHMM":"10:00","endHHMM":"11:00","capacity":1}
      """
    Then the response code should be 201
    And save json "id" as "classE"
    # Create guardians/students
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pA","phone":"+1-555-3001"}
      """
    Then the response code should be 201
    And save json "id" as "gA"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pB","phone":"+1-555-3002"}
      """
    Then the response code should be 201
    And save json "id" as "gB"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${gA}","firstName":"Stu","lastName":"A"}
      """
    Then the response code should be 201
    And save json "id" as "sA"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${gB}","firstName":"Stu","lastName":"B"}
      """
    Then the response code should be 201
    And save json "id" as "sB"
    # Public apply A then B (waitlist)
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"${sA}","classId":"${classE}"}
      """
    Then the response code should be 201
    And save json "id" as "enA"
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"${sB}","classId":"${classE}"}
      """
    Then the response code should be 201
    And save json "id" as "enB"
    # Admin get enrollment A
    When I GET "/v1/enrollments/${enA}"
    Then the response code should be 200
    # Try to set B to enrolled; should fail (class full)
    When I POST "/v1/enrollments/${enB}:setStatus" with body:
      """
      {"status":"enrolled"}
      """
    Then the response code should be 400
    # Drop A -> promote B
    When I POST "/v1/enrollments/${enA}:drop"
    Then the response code should be 200
    And the response body should contain "promoted"

  Scenario: Duplicate apply and invalid IDs (negative)
    Given I am an admin user with id "admin1"
    When I POST "/v1/terms" with body:
      """
      {"name":"Neg Term"}
      """
    Then the response code should be 201
    And save json "id" as "tNeg"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Neg Campus"}
      """
    Then the response code should be 201
    And save json "id" as "cNeg"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${cNeg}","name":"RN","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "rNeg"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${tNeg}","campusId":"${cNeg}","roomId":"${rNeg}","teacherId":"teachN","level":"L1","weekday":1,"startHHMM":"10:00","endHHMM":"11:00","capacity":2}
      """
    Then the response code should be 201
    And save json "id" as "classNeg"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pNeg","phone":"+1"}
      """
    Then the response code should be 201
    And save json "id" as "gNeg"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${gNeg}","firstName":"X","lastName":"N"}
      """
    Then the response code should be 201
    And save json "id" as "sNeg"
    # First apply
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"${sNeg}","classId":"${classNeg}"}
      """
    Then the response code should be 201
    # Duplicate apply rejected
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"${sNeg}","classId":"${classNeg}"}
      """
    Then the response code should be 400
    # Invalid studentId
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"nope","classId":"${classNeg}"}
      """
    Then the response code should be 400
    # Invalid classId
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"${sNeg}","classId":"nope"}
      """
    Then the response code should be 400
