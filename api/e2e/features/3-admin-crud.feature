Feature: Admin CRUD for terms, campuses, rooms, classes

  Background:
    Given the API server is running
    And I am an admin user with id "admin1"

  Scenario: Create term (happy path)
    When I POST "/v1/terms" with body:
      """
      {"name":"Fall QA"}
      """
    Then the response code should be 201
    And save json "id" as "termId"

  Scenario: Create campus (happy path)
    When I POST "/v1/campuses" with body:
      """
      {"name":"QA Campus"}
      """
    Then the response code should be 201
    And save json "id" as "campusId"

  Scenario: Create room with validation errors (negative)
    # Create a campus for context
    When I POST "/v1/campuses" with body:
      """
      {"name":"Room Campus"}
      """
    Then the response code should be 201
    And save json "id" as "campForRoom"
    # Now invalid room
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${campForRoom}","name":"R-1","capacity":0}
      """
    Then the response code should be 400

  Scenario: Create room (happy path)
    When I POST "/v1/campuses" with body:
      """
      {"name":"Room Campus OK"}
      """
    Then the response code should be 201
    And save json "id" as "campOK"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${campOK}","name":"R-1","capacity":20}
      """
    Then the response code should be 201
    And save json "id" as "roomId"

  Scenario: Duplicate room name in same campus (negative)
    When I POST "/v1/campuses" with body:
      """
      {"name":"Dup Campus"}
      """
    Then the response code should be 201
    And save json "id" as "campDup"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${campDup}","name":"R-1","capacity":10}
      """
    Then the response code should be 201
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${campDup}","name":"R-1","capacity":10}
      """
    Then the response code should be 409

  Scenario: Create class with missing links (negative)
    When I POST "/v1/classes" with body:
      """
      {"termId":"","campusId":"","roomId":"","level":"L1","weekday":2,"startHHMM":"15:30","endHHMM":"16:30","capacity":10}
      """
    Then the response code should be 400

  Scenario: Create class (happy path)
    When I POST "/v1/terms" with body:
      """
      {"name":"Class Term"}
      """
    Then the response code should be 201
    And save json "id" as "t1"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Class Campus"}
      """
    Then the response code should be 201
    And save json "id" as "c1"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${c1}","name":"CR1","capacity":30}
      """
    Then the response code should be 201
    And save json "id" as "r1"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${t1}","campusId":"${c1}","roomId":"${r1}","teacherId":"teach1","level":"L1","weekday":2,"startHHMM":"15:30","endHHMM":"16:30","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "classId"

  Scenario: Get class (happy path)
    # setup
    When I POST "/v1/terms" with body:
      """
      {"name":"GetClass Term"}
      """
    Then the response code should be 201
    And save json "id" as "gt"
    When I POST "/v1/campuses" with body:
      """
      {"name":"GetClass Campus"}
      """
    Then the response code should be 201
    And save json "id" as "gc"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${gc}","name":"GR","capacity":20}
      """
    Then the response code should be 201
    And save json "id" as "gr"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${gt}","campusId":"${gc}","roomId":"${gr}","teacherId":"teach1","level":"L1","weekday":2,"startHHMM":"15:30","endHHMM":"16:30","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "cid"
    # get
    When I GET "/v1/classes/${cid}"
    Then the response code should be 200
    And json "teacherId" equals "teach1"

  Scenario: Update class invalid time (negative)
    # setup
    When I POST "/v1/terms" with body:
      """
      {"name":"Upd Term"}
      """
    Then the response code should be 201
    And save json "id" as "ut"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Upd Campus"}
      """
    Then the response code should be 201
    And save json "id" as "uc"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${uc}","name":"UR","capacity":20}
      """
    Then the response code should be 201
    And save json "id" as "ur"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${ut}","campusId":"${uc}","roomId":"${ur}","teacherId":"teach1","level":"L1","weekday":2,"startHHMM":"15:30","endHHMM":"16:30","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "clid"
    # invalid update
    When I PUT "/v1/classes/${clid}" with body:
      """
      {"termId":"${ut}","campusId":"${uc}","roomId":"${ur}","teacherId":"teach1","level":"L1","weekday":2,"startHHMM":"17:30","endHHMM":"16:30","capacity":10}
      """
    Then the response code should be 400

  Scenario: Non-admin forbidden (negative)
    Given I am a parent user with id "dev-parent"
    When I GET "/v1/terms"
    Then the response code should be 403
