Feature: Assessments and Scores

  Background:
    Given the API server is running

  Scenario: Scoring flow and parent read
    Given I am an admin user with id "admin1"
    # Setup class and enrolled student
    When I POST "/v1/terms" with body:
      """
      {"name":"Assess Term"}
      """
    Then the response code should be 201
    And save json "id" as "tS"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Assess Campus"}
      """
    Then the response code should be 201
    And save json "id" as "cS"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${cS}","name":"RS","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "rS"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${tS}","campusId":"${cS}","roomId":"${rS}","teacherId":"teachS","level":"L4","weekday":4,"startHHMM":"13:00","endHHMM":"14:00","capacity":2}
      """
    Then the response code should be 201
    And save json "id" as "clsS"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pS","phone":"+1-555-4001"}
      """
    Then the response code should be 201
    And save json "id" as "gS"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${gS}","firstName":"Stu","lastName":"S"}
      """
    Then the response code should be 201
    And save json "id" as "sS"
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"${sS}","classId":"${clsS}"}
      """
    Then the response code should be 201
    # Teacher creates assessment and scores
    Given I am a teacher user with id "teachS"
    When I POST "/v1/assessments" with body:
      """
      {"classId":"${clsS}","title":"Quiz 1","maxScore":100}
      """
    Then the response code should be 201
    And save json "id" as "aS"
    When I POST "/v1/assessments/${aS}/scores" with body:
      """
      [{"studentId":"${sS}","value":95}]
      """
    Then the response code should be 204
    # Parent reads scores
    Given I am a parent user with id "pS"
    When I GET "/v1/students/${sS}/scores"
    Then the response code should be 200
    And json array "items" length ">=" 1

  Scenario: Teacher cannot score non-enrolled student (negative)
    Given I am an admin user with id "admin1"
    # Setup class and assessment
    When I POST "/v1/terms" with body:
      """
      {"name":"Neg Assess Term"}
      """
    Then the response code should be 201
    And save json "id" as "tN"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Neg Assess Campus"}
      """
    Then the response code should be 201
    And save json "id" as "cN"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${cN}","name":"RN","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "rN"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${tN}","campusId":"${cN}","roomId":"${rN}","teacherId":"teachN","level":"L1","weekday":1,"startHHMM":"10:00","endHHMM":"11:00","capacity":2}
      """
    Then the response code should be 201
    And save json "id" as "clsN"
    Given I am a teacher user with id "teachN"
    When I POST "/v1/assessments" with body:
      """
      {"classId":"${clsN}","title":"Quiz N","maxScore":50}
      """
    Then the response code should be 201
    And save json "id" as "aN"
    # Create a student not enrolled
    Given I am an admin user with id "admin1"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pNN","phone":"+1-555-4099"}
      """
    Then the response code should be 201
    And save json "id" as "gNN"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${gNN}","firstName":"X","lastName":"Y"}
      """
    Then the response code should be 201
    And save json "id" as "sNN"
    # Teacher tries to score not-enrolled student
    Given I am a teacher user with id "teachN"
    When I POST "/v1/assessments/${aN}/scores" with body:
      """
      [{"studentId":"${sNN}","value":40}]
      """
    Then the response code should be 400
