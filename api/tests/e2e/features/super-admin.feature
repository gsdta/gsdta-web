Feature: Super Admin API
  As a super admin
  I want to access administrative features
  So that I can manage the system configuration and security

  Background:
    Given the API is running

  # Feature Flags
  Scenario: Super admin can list feature flags
    Given I am authenticated as a super admin
    When I send a GET request to "/api/v1/super-admin/feature-flags"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
    And the JSON path "data.flags" should exist

  Scenario: Super admin can update feature flags
    Given I am authenticated as a super admin
    When I send a PUT request to "/api/v1/super-admin/feature-flags" with JSON body:
      """
      {
        "role": "admin",
        "flags": {
          "Students": { "enabled": true }
        }
      }
      """
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  # Audit Log
  Scenario: Super admin can view audit log
    Given I am authenticated as a super admin
    When I send a GET request to "/api/v1/super-admin/audit-log"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
    And the JSON path "data.entries" should exist

  Scenario: Super admin can filter audit log by date
    Given I am authenticated as a super admin
    When I send a GET request to "/api/v1/super-admin/audit-log?startDate=2024-01-01&endDate=2024-12-31"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  # System Config
  Scenario: Super admin can view system config
    Given I am authenticated as a super admin
    When I send a GET request to "/api/v1/super-admin/config"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  # Security
  Scenario: Super admin can view security events
    Given I am authenticated as a super admin
    When I send a GET request to "/api/v1/super-admin/security"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  # User Management
  Scenario: Super admin can list admin users
    Given I am authenticated as a super admin
    When I send a GET request to "/api/v1/super-admin/users/admins"
    Then the response status should be 200
    And the JSON path "success" should equal "true"
    And the JSON path "data.admins" should exist

  # Deleted Data Recovery
  Scenario: Super admin can view deleted data
    Given I am authenticated as a super admin
    When I send a GET request to "/api/v1/super-admin/deleted-data"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  # Data Export
  Scenario: Super admin can list export jobs
    Given I am authenticated as a super admin
    When I send a GET request to "/api/v1/super-admin/export"
    Then the response status should be 200
    And the JSON path "success" should equal "true"

  Scenario: Super admin can create export job
    Given I am authenticated as a super admin
    When I send a POST request to "/api/v1/super-admin/export" with JSON body:
      """
      {
        "type": "students"
      }
      """
    Then the response status should be 201
    And the JSON path "success" should equal "true"
    And the JSON path "data.jobId" should exist

  # RBAC - Deny non-super-admin access
  Scenario: Regular admin cannot access super admin endpoints
    Given I am authenticated as an admin
    When I send a GET request to "/api/v1/super-admin/feature-flags"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Teacher cannot access super admin endpoints
    Given I am authenticated as a teacher
    When I send a GET request to "/api/v1/super-admin/audit-log"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Parent cannot access super admin endpoints
    Given I am authenticated as a parent
    When I send a GET request to "/api/v1/super-admin/config"
    Then the response status should be 403
    And the JSON path "code" should equal "auth/forbidden"

  Scenario: Unauthenticated request to super admin is rejected
    When I send a GET request to "/api/v1/super-admin/feature-flags"
    Then the response status should be 401
    And the JSON path "code" should equal "auth/missing-token"
