import {
  VOLUNTEER_TYPES,
  GRADE_LEVELS,
  DAYS_OF_WEEK,
  CURRENT_ACADEMIC_YEAR,
  getVolunteerTypeLabel,
} from "../volunteer-types";
import type {
  Volunteer,
  VolunteerType,
  VolunteerStatus,
  CreateVolunteerInput,
  UpdateVolunteerInput,
  VolunteerClassAssignment,
  EmergencyContact,
} from "../volunteer-types";

describe("volunteer-types", () => {
  describe("VOLUNTEER_TYPES constant", () => {
    it("should have high_school, parent, and community types", () => {
      expect(VOLUNTEER_TYPES).toHaveLength(3);
      expect(VOLUNTEER_TYPES.map((t) => t.value)).toContain("high_school");
      expect(VOLUNTEER_TYPES.map((t) => t.value)).toContain("parent");
      expect(VOLUNTEER_TYPES.map((t) => t.value)).toContain("community");
    });

    it("should have labels for each type", () => {
      for (const type of VOLUNTEER_TYPES) {
        expect(type.label).toBeDefined();
        expect(type.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("GRADE_LEVELS constant", () => {
    it("should have high school grade levels", () => {
      expect(GRADE_LEVELS).toContain("9th");
      expect(GRADE_LEVELS).toContain("10th");
      expect(GRADE_LEVELS).toContain("11th");
      expect(GRADE_LEVELS).toContain("12th");
    });
  });

  describe("DAYS_OF_WEEK constant", () => {
    it("should have Saturday and Sunday", () => {
      expect(DAYS_OF_WEEK).toContain("Saturday");
      expect(DAYS_OF_WEEK).toContain("Sunday");
    });
  });

  describe("CURRENT_ACADEMIC_YEAR constant", () => {
    it("should be 2025-2026", () => {
      expect(CURRENT_ACADEMIC_YEAR).toBe("2025-2026");
    });
  });

  describe("getVolunteerTypeLabel function", () => {
    it("should return correct label for high_school type", () => {
      expect(getVolunteerTypeLabel("high_school")).toBe("High School Volunteer");
    });

    it("should return correct label for parent type", () => {
      expect(getVolunteerTypeLabel("parent")).toBe("Parent Volunteer");
    });

    it("should return correct label for community type", () => {
      expect(getVolunteerTypeLabel("community")).toBe("Community Volunteer");
    });

    it("should return the type value if not found", () => {
      expect(getVolunteerTypeLabel("unknown" as VolunteerType)).toBe("unknown");
    });
  });

  describe("Type definitions", () => {
    it("should allow valid VolunteerType values", () => {
      const types: VolunteerType[] = ["high_school", "parent", "community"];
      expect(types).toHaveLength(3);
    });

    it("should allow valid VolunteerStatus values", () => {
      const statuses: VolunteerStatus[] = ["active", "inactive"];
      expect(statuses).toHaveLength(2);
    });

    it("should create valid VolunteerClassAssignment object", () => {
      const assignment: VolunteerClassAssignment = {
        classId: "class-1",
        className: "PS-1 A",
        gradeId: "ps-1",
        gradeName: "PS-1",
        assignedAt: new Date().toISOString(),
        assignedBy: "admin-user",
      };

      expect(assignment.classId).toBe("class-1");
      expect(assignment.className).toBe("PS-1 A");
    });

    it("should create valid EmergencyContact object", () => {
      const contact: EmergencyContact = {
        name: "John Doe",
        phone: "555-123-4567",
        relationship: "Parent",
      };

      expect(contact.name).toBe("John Doe");
      expect(contact.relationship).toBe("Parent");
    });

    it("should create valid Volunteer object", () => {
      const volunteer: Volunteer = {
        id: "vol-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        phone: "555-123-4567",
        type: "high_school",
        school: "Poway High School",
        gradeLevel: "11th",
        classAssignments: [],
        availableDays: ["Saturday"],
        status: "active",
        academicYear: "2025-2026",
        totalHours: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(volunteer.id).toBe("vol-1");
      expect(volunteer.type).toBe("high_school");
      expect(volunteer.status).toBe("active");
    });

    it("should create valid CreateVolunteerInput object", () => {
      const input: CreateVolunteerInput = {
        firstName: "John",
        lastName: "Doe",
        type: "high_school",
        academicYear: "2025-2026",
      };

      expect(input.firstName).toBe("John");
      expect(input.school).toBeUndefined();
    });

    it("should create valid UpdateVolunteerInput object with partial fields", () => {
      const input: UpdateVolunteerInput = {
        school: "New High School",
        status: "inactive",
      };

      expect(input.school).toBe("New High School");
      expect(input.status).toBe("inactive");
      expect(input.firstName).toBeUndefined();
    });

    it("should allow optional emergency contact", () => {
      const volunteer: Volunteer = {
        id: "vol-2",
        firstName: "Jane",
        lastName: "Smith",
        type: "parent",
        classAssignments: [],
        status: "active",
        academicYear: "2025-2026",
        emergencyContact: {
          name: "Bob Smith",
          phone: "555-987-6543",
          relationship: "Spouse",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(volunteer.emergencyContact?.name).toBe("Bob Smith");
    });
  });
});
