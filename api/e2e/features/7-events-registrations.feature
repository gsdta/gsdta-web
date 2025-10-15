Feature: Events and Registrations

  Background:
    Given the API server is running

  Scenario: Registrations list and cancellation promotion
    Given I am an admin user with id "admin1"
    # Event and students
    When I POST "/v1/events" with body:
      """
      {"title":"Open House","capacity":1}
      """
    Then the response code should be 201
    And save json "id" as "evt"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pE1","phone":"+1-555-5001"}
      """
    Then the response code should be 201
    And save json "id" as "g1"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pE2","phone":"+1-555-5002"}
      """
    Then the response code should be 201
    And save json "id" as "g2"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${g1}","firstName":"A","lastName":"E"}
      """
    Then the response code should be 201
    And save json "id" as "s1"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${g2}","firstName":"B","lastName":"E"}
      """
    Then the response code should be 201
    And save json "id" as "s2"
    # Parent1 registers (registered)
    Given I am a parent user with id "pE1"
    When I POST "/v1/events/${evt}/registrations" with body:
      """
      {"studentId":"${s1}"}
      """
    Then the response code should be 201
    And save json "id" as "reg1"
    # Parent2 registers (waitlisted)
    Given I am a parent user with id "pE2"
    When I POST "/v1/events/${evt}/registrations" with body:
      """
      {"studentId":"${s2}"}
      """
    Then the response code should be 201
    And save json "id" as "reg2"
    # Admin lists shows 2
    Given I am an admin user with id "admin1"
    When I GET "/v1/events/${evt}/registrations"
    Then the response code should be 200
    And json array "items" length ">=" 2
    # Cancel first -> promote second
    Given I am a parent user with id "pE1"
    When I POST "/v1/eventRegistrations/${reg1}:cancel"
    Then the response code should be 200
    And the response body should contain "promoted"
    # Parent1 cannot cancel reg2
    When I POST "/v1/eventRegistrations/${reg2}:cancel"
    Then the response code should be 403

  Scenario: Parent cannot register non-owned student (negative)
    Given I am an admin user with id "admin1"
    When I POST "/v1/events" with body:
      """
      {"title":"Another Event","capacity":1}
      """
    Then the response code should be 201
    And save json "id" as "ev2"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pOwn","phone":"+1-555-5101"}
      """
    Then the response code should be 201
    And save json "id" as "gOwn"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pOther","phone":"+1-555-5102"}
      """
    Then the response code should be 201
    And save json "id" as "gOther"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${gOther}","firstName":"C","lastName":"E"}
      """
    Then the response code should be 201
    And save json "id" as "sOther"
    Given I am a parent user with id "pOwn"
    When I POST "/v1/events/${ev2}/registrations" with body:
      """
      {"studentId":"${sOther}"}
      """
    Then the response code should be 403

  Scenario: Duplicate registration and invalid IDs (negative)
    Given I am an admin user with id "admin1"
    When I POST "/v1/events" with body:
      """
      {"title":"Neg Event","capacity":2}
      """
    Then the response code should be 201
    And save json "id" as "eNeg"
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pn","phone":"+1"}
      """
    Then the response code should be 201
    And save json "id" as "gNeg"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${gNeg}","firstName":"N","lastName":"E"}
      """
    Then the response code should be 201
    And save json "id" as "sNeg"
    Given I am a parent user with id "pn"
    When I POST "/v1/events/${eNeg}/registrations" with body:
      """
      {"studentId":"${sNeg}"}
      """
    Then the response code should be 201
    # Duplicate apply
    When I POST "/v1/events/${eNeg}/registrations" with body:
      """
      {"studentId":"${sNeg}"}
      """
    Then the response code should be 400
    # Invalid studentId
    When I POST "/v1/events/${eNeg}/registrations" with body:
      """
      {"studentId":"nope"}
      """
    Then the response code should be 400
    # Invalid eventId
    When I POST "/v1/events/badid/registrations" with body:
      """
      {"studentId":"${sNeg}"}
      """
    Then the response code should be 400
    # Cancel non-existent id
    When I POST "/v1/eventRegistrations/missing:cancel"
    Then the response code should be 404
