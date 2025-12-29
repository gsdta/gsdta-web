@admin @hero @wip
Feature: Hero Content Management
  As an admin
  I want to manage hero content (event banners)
  So that I can display important announcements on the homepage

  Background:
    Given I am logged in as admin

  # =============================================================================
  # SECTION 1: VIEW HERO CONTENT
  # =============================================================================

  @smoke
  Scenario: UAT-G001 - Admin can view hero content list
    When I navigate to the hero content page
    Then I should see the hero content list
    And the page should load without errors

  Scenario: Admin can see active and inactive banners
    When I navigate to the hero content page
    Then I should see banners with active status
    And I should see banners with inactive status

  # =============================================================================
  # SECTION 2: CREATE EVENT BANNER
  # =============================================================================

  Scenario: UAT-G002 - Admin can create event banner
    Given I am on the hero content page
    When I click the "Create Banner" button
    Then I should see the create banner form

  Scenario: UAT-G003 - Admin can add bilingual title
    Given I am creating a new banner
    When I enter the English title "Summer Festival 2025"
    And I enter the Tamil title "கோடை திருவிழா 2025"
    Then the bilingual title fields should be filled

  Scenario: UAT-G004 - Admin can set display date range
    Given I am creating a new banner
    When I set the start date to tomorrow
    And I set the end date to next week
    Then the date range should be valid

  Scenario: UAT-G005 - Admin can set priority
    Given I am creating a new banner
    When I set the priority to 5
    Then the priority field should show 5

  Scenario: UAT-G006 - Admin can add CTA button
    Given I am creating a new banner
    When I enter CTA text "Learn More"
    And I enter CTA link "/about"
    Then the CTA fields should be filled

  Scenario: Admin can save new banner
    Given I have filled all required banner fields
    When I click the save button
    Then I should see a success message
    And the new banner should appear in the list

  # =============================================================================
  # SECTION 3: MANAGE BANNERS
  # =============================================================================

  Scenario: UAT-G007 - Admin can activate banner
    Given there is an inactive banner
    When I click the activate toggle for that banner
    Then the banner should become active

  Scenario: Admin can deactivate banner
    Given there is an active banner
    When I click the deactivate toggle for that banner
    Then the banner should become inactive

  Scenario: Admin can edit banner
    Given there is an existing banner
    When I click the edit button for that banner
    Then I should see the edit form with current values

  # =============================================================================
  # SECTION 4: HOMEPAGE DISPLAY
  # =============================================================================

  Scenario: UAT-G008 - Active banner shows on homepage
    Given there is an active banner with valid date range
    When I navigate to the home page
    Then I should see the hero carousel
    And I should see the event banner content

  Scenario: UAT-G009 - Expired banner does not show
    Given there is a banner with past end date
    When I navigate to the home page
    Then I should not see that banner in the carousel

  Scenario: UAT-G010 - Carousel alternates between content
    Given there is an active event banner
    When I navigate to the home page
    And I wait for 15 seconds
    Then I should see the carousel has changed slides
