Feature: Announcements

  Background:
    Given the API server is running

  Scenario: Public sees only school scope and published
    When I GET "/v1/announcements?scope=school"
    Then the response code should be 200

  Scenario: Admin creates school and class announcements
    Given I am an admin user with id "admin1"
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"school","title":"Welcome","body":"Hi"}
      """
    Then the response code should be 201
    And save json "id" as "aSchool"
    # create class infra
    When I POST "/v1/terms" with body:
      """
      {"name":"Ann Term"}
      """
    Then the response code should be 201
    And save json "id" as "tAn"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Ann Campus"}
      """
    Then the response code should be 201
    And save json "id" as "cAn"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${cAn}","name":"RAn","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "rAn"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${tAn}","campusId":"${cAn}","roomId":"${rAn}","teacherId":"teachAn","level":"L5","weekday":2,"startHHMM":"12:00","endHHMM":"13:00","capacity":5}
      """
    Then the response code should be 201
    And save json "id" as "clsAn"
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"class","classId":"${clsAn}","title":"Class News","body":"Body"}
      """
    Then the response code should be 201
    And save json "id" as "aClass"

  Scenario: Class announcements require role
    Given I am an admin user with id "admin1"
    # Create class and class announcement
    When I POST "/v1/terms" with body:
      """
      {"name":"Role Term"}
      """
    Then the response code should be 201
    And save json "id" as "tR"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Role Campus"}
      """
    Then the response code should be 201
    And save json "id" as "cR"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${cR}","name":"RR","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "rR"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${tR}","campusId":"${cR}","roomId":"${rR}","teacherId":"teachAn","level":"L5","weekday":2,"startHHMM":"12:00","endHHMM":"13:00","capacity":5}
      """
    Then the response code should be 201
    And save json "id" as "clsR"
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"class","classId":"${clsR}","title":"Class News","body":"Body"}
      """
    Then the response code should be 201
    # Teacher can view
    Given I am a teacher user with id "teachAn"
    When I GET "/v1/classes/${clsR}/announcements"
    Then the response code should be 200
    # Parent not enrolled cannot view
    Given I am a parent user with id "pAnn"
    When I GET "/v1/classes/${clsR}/announcements"
    Then the response code should be 403

  Scenario: Public does not see future-dated school announcement until published
    Given I am an admin user with id "admin1"
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"school","title":"Future School","body":"Later","publishAt":"2100-01-01T00:00:00Z"}
      """
    Then the response code should be 201
    And save json "id" as "aFuture"
    When I GET "/v1/announcements?scope=school"
    Then the response code should be 200
    And the response body should not contain "Future School"
    # publish by setting publishAt in the past
    When I PUT "/v1/admin/announcements/${aFuture}" with body:
      """
      {"scope":"school","title":"Future School","body":"Later","publishAt":"2000-01-01T00:00:00Z"}
      """
    Then the response code should be 200
    When I GET "/v1/announcements?scope=school"
    Then the response code should be 200
    And the response body should contain "Future School"

  Scenario: Public does not see class announcements
    Given I am an admin user with id "admin1"
    When I POST "/v1/terms" with body:
      """
      {"name":"Pub Term"}
      """
    Then the response code should be 201
    And save json "id" as "tP"
    When I POST "/v1/campuses" with body:
      """
      {"name":"Pub Campus"}
      """
    Then the response code should be 201
    And save json "id" as "cP"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${cP}","name":"RP","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "rP"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${tP}","campusId":"${cP}","roomId":"${rP}","teacherId":"teachP","level":"L6","weekday":3,"startHHMM":"10:00","endHHMM":"11:00","capacity":5}
      """
    Then the response code should be 201
    And save json "id" as "clsP"
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"class","classId":"${clsP}","title":"Class Pub","body":"Visible to class","publishAt":"2000-01-01T00:00:00Z"}
      """
    Then the response code should be 201
    When I GET "/v1/announcements?scope=school"
    Then the response code should be 200
    And the response body should not contain "Class Pub"

  Scenario: Admin announcement validation errors
    Given I am an admin user with id "admin1"
    # Missing title
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"school","title":"","body":"x"}
      """
    Then the response code should be 400
    # Invalid scope
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"invalid","title":"Bad","body":"x"}
      """
    Then the response code should be 400
    # Class scope missing classId
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"class","title":"No Class","body":"x"}
      """
    Then the response code should be 400

  Scenario: Parent with enrolled student can view class announcements
    Given I am an admin user with id "admin1"
    # Create class and announcement
    When I POST "/v1/terms" with body:
      """
      {"name":"ParentView Term"}
      """
    Then the response code should be 201
    And save json "id" as "tPV"
    When I POST "/v1/campuses" with body:
      """
      {"name":"ParentView Campus"}
      """
    Then the response code should be 201
    And save json "id" as "cPV"
    When I POST "/v1/rooms" with body:
      """
      {"campusId":"${cPV}","name":"RPV","capacity":10}
      """
    Then the response code should be 201
    And save json "id" as "rPV"
    When I POST "/v1/classes" with body:
      """
      {"termId":"${tPV}","campusId":"${cPV}","roomId":"${rPV}","teacherId":"tPV","level":"L7","weekday":4,"startHHMM":"14:00","endHHMM":"15:00","capacity":5}
      """
    Then the response code should be 201
    And save json "id" as "clsPV"
    When I POST "/v1/admin/announcements" with body:
      """
      {"scope":"class","classId":"${clsPV}","title":"For Enrolled","body":"Hello","publishAt":"2000-01-01T00:00:00Z"}
      """
    Then the response code should be 201
    # Create guardian/student and enroll
    When I POST "/v1/guardians" with body:
      """
      {"userId":"pAnn2","phone":"+1"}
      """
    Then the response code should be 201
    And save json "id" as "gPV"
    When I POST "/v1/students" with body:
      """
      {"guardianId":"${gPV}","firstName":"Kid","lastName":"PV"}
      """
    Then the response code should be 201
    And save json "id" as "sPV"
    When I POST "/v1/enrollments:apply" with body:
      """
      {"studentId":"${sPV}","classId":"${clsPV}"}
      """
    Then the response code should be 201
    # Parent can view
    Given I am a parent user with id "pAnn2"
    When I GET "/v1/classes/${clsPV}/announcements"
    Then the response code should be 200
    And the response body should contain "For Enrolled"
