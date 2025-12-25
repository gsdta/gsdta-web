import {
  TEXTBOOK_TYPES,
  SEMESTERS,
  CURRENT_ACADEMIC_YEAR,
  getTextbookTypeLabel,
} from "../textbook-types";
import type {
  Textbook,
  TextbookType,
  TextbookStatus,
  CreateTextbookInput,
  UpdateTextbookInput,
} from "../textbook-types";

describe("textbook-types", () => {
  describe("TEXTBOOK_TYPES constant", () => {
    it("should have textbook, homework, and combined types", () => {
      expect(TEXTBOOK_TYPES).toHaveLength(3);
      expect(TEXTBOOK_TYPES.map((t) => t.value)).toContain("textbook");
      expect(TEXTBOOK_TYPES.map((t) => t.value)).toContain("homework");
      expect(TEXTBOOK_TYPES.map((t) => t.value)).toContain("combined");
    });

    it("should have labels for each type", () => {
      for (const type of TEXTBOOK_TYPES) {
        expect(type.label).toBeDefined();
        expect(type.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe("SEMESTERS constant", () => {
    it("should have four semesters", () => {
      expect(SEMESTERS).toContain("First");
      expect(SEMESTERS).toContain("Second");
      expect(SEMESTERS).toContain("Third");
      expect(SEMESTERS).toContain("Fourth");
    });
  });

  describe("CURRENT_ACADEMIC_YEAR constant", () => {
    it("should be 2025-2026", () => {
      expect(CURRENT_ACADEMIC_YEAR).toBe("2025-2026");
    });
  });

  describe("getTextbookTypeLabel function", () => {
    it("should return correct label for textbook type", () => {
      expect(getTextbookTypeLabel("textbook")).toBe("Textbook");
    });

    it("should return correct label for homework type", () => {
      expect(getTextbookTypeLabel("homework")).toBe("Homework");
    });

    it("should return the type value if not found", () => {
      expect(getTextbookTypeLabel("unknown" as TextbookType)).toBe("unknown");
    });
  });

  describe("Type definitions", () => {
    it("should allow valid TextbookType values", () => {
      const types: TextbookType[] = ["textbook", "homework"];
      expect(types).toHaveLength(2);
    });

    it("should allow valid TextbookStatus values", () => {
      const statuses: TextbookStatus[] = ["active", "inactive"];
      expect(statuses).toHaveLength(2);
    });

    it("should create valid Textbook object", () => {
      const textbook: Textbook = {
        id: "tb-1",
        gradeId: "grade-1",
        gradeName: "Grade-1",
        itemNumber: "#910131",
        name: "Test Textbook",
        type: "textbook",
        semester: "First",
        pageCount: 100,
        copies: 25,
        status: "active",
        academicYear: "2025-2026",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(textbook.id).toBe("tb-1");
      expect(textbook.type).toBe("textbook");
      expect(textbook.status).toBe("active");
    });

    it("should create valid CreateTextbookInput object", () => {
      const input: CreateTextbookInput = {
        gradeId: "grade-1",
        itemNumber: "#910131",
        name: "Test Textbook",
        type: "textbook",
        pageCount: 100,
        copies: 25,
        academicYear: "2025-2026",
      };

      expect(input.gradeId).toBe("grade-1");
      expect(input.semester).toBeUndefined();
    });

    it("should create valid UpdateTextbookInput object with partial fields", () => {
      const input: UpdateTextbookInput = {
        name: "Updated Name",
        status: "inactive",
      };

      expect(input.name).toBe("Updated Name");
      expect(input.status).toBe("inactive");
      expect(input.gradeId).toBeUndefined();
    });
  });
});
