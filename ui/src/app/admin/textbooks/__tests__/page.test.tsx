import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminTextbooksPage from "../page";
import { useAuth } from "@/components/AuthProvider";
import * as textbookApi from "@/lib/textbook-api";
import * as gradeApi from "@/lib/grade-api";

// Mock dependencies
jest.mock("@/components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/textbook-api");
jest.mock("@/lib/grade-api");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockTextbookApi = textbookApi as jest.Mocked<typeof textbookApi>;
const mockGradeApi = gradeApi as jest.Mocked<typeof gradeApi>;

describe("AdminTextbooksPage", () => {
  const mockGetIdToken = jest.fn();

  const mockGrades = [
    { id: "ps-1", name: "PS-1", displayName: "PS-1 (Mazhalai)", displayOrder: 1, status: "active" as const },
    { id: "grade-1", name: "Grade-1", displayName: "Grade-1", displayOrder: 3, status: "active" as const },
  ];

  const mockTextbooks = [
    {
      id: "tb-1",
      gradeId: "ps-1",
      gradeName: "PS-1",
      itemNumber: "#910131",
      name: "Mazhalai Textbook First Semester",
      type: "textbook" as const,
      semester: "First",
      pageCount: 100,
      copies: 25,
      status: "active" as const,
      academicYear: "2025-2026",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "tb-2",
      gradeId: "grade-1",
      gradeName: "Grade-1",
      itemNumber: "#920001",
      name: "Grade 1 Homework",
      type: "homework" as const,
      pageCount: 50,
      copies: 30,
      status: "inactive" as const,
      academicYear: "2025-2026",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { email: "admin@example.com" },
      getIdToken: mockGetIdToken,
    } as any);

    mockGetIdToken.mockResolvedValue("admin-token");

    // Default mocks
    mockTextbookApi.adminGetTextbooks.mockResolvedValue({ textbooks: [], total: 0 });
    mockGradeApi.adminGetGrades.mockResolvedValue({ grades: mockGrades, total: 2 });
  });

  test("should render loading state initially", async () => {
    // Delay resolution to check loading state
    mockTextbookApi.adminGetTextbooks.mockImplementationOnce(() => new Promise(() => {}));

    const { container } = render(<AdminTextbooksPage />);
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  test("should render empty state when no textbooks", async () => {
    render(<AdminTextbooksPage />);

    await waitFor(() => {
      expect(screen.getByText(/no textbooks found/i)).toBeInTheDocument();
    });
  });

  test("should render list of textbooks", async () => {
    mockTextbookApi.adminGetTextbooks.mockResolvedValue({
      textbooks: mockTextbooks,
      total: 2,
    });

    render(<AdminTextbooksPage />);

    await waitFor(() => {
      expect(screen.getByText("Mazhalai Textbook First Semester")).toBeInTheDocument();
      expect(screen.getByText("Grade 1 Homework")).toBeInTheDocument();
    });

    // Check item numbers
    expect(screen.getByText("#910131")).toBeInTheDocument();
    expect(screen.getByText("#920001")).toBeInTheDocument();
  });

  test("should open create modal when Add Textbook is clicked", async () => {
    render(<AdminTextbooksPage />);

    await waitFor(() => {
      expect(screen.getByText(/no textbooks found/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Add Textbook"));

    await waitFor(() => {
      expect(screen.getByText("Add New Textbook")).toBeInTheDocument();
    });
  });

  test("should show create form in modal", async () => {
    render(<AdminTextbooksPage />);

    await waitFor(() => {
      expect(screen.getByText("Add Textbook")).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByText("Add Textbook"));

    await waitFor(() => {
      expect(screen.getByText("Add New Textbook")).toBeInTheDocument();
    });

    // Check form elements are present
    expect(screen.getByPlaceholderText("#910131")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Mazhalai Textbook/i)).toBeInTheDocument();
    expect(screen.getByText("Create Textbook")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Add New Textbook")).not.toBeInTheDocument();
    });
  });

  test("should toggle textbook status", async () => {
    mockTextbookApi.adminGetTextbooks.mockResolvedValue({
      textbooks: [mockTextbooks[0]],
      total: 1,
    });
    mockTextbookApi.adminUpdateTextbook.mockResolvedValue({
      ...mockTextbooks[0],
      status: "inactive",
    });

    render(<AdminTextbooksPage />);

    await waitFor(() => {
      expect(screen.getByText("Mazhalai Textbook First Semester")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Deactivate"));

    await waitFor(() => {
      expect(mockTextbookApi.adminUpdateTextbook).toHaveBeenCalledWith(
        expect.any(Function),
        "tb-1",
        { status: "inactive" }
      );
    });
  });

  test("should delete a textbook with confirmation", async () => {
    mockTextbookApi.adminGetTextbooks.mockResolvedValue({
      textbooks: [mockTextbooks[0]],
      total: 1,
    });
    mockTextbookApi.adminDeleteTextbook.mockResolvedValue();

    // Mock window.confirm
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminTextbooksPage />);

    await waitFor(() => {
      expect(screen.getByText("Mazhalai Textbook First Semester")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(mockTextbookApi.adminDeleteTextbook).toHaveBeenCalledWith(
        expect.any(Function),
        "tb-1"
      );
    });

    confirmSpy.mockRestore();
  });

  test("should filter textbooks by status", async () => {
    mockTextbookApi.adminGetTextbooks.mockResolvedValue({
      textbooks: mockTextbooks,
      total: 2,
    });

    render(<AdminTextbooksPage />);

    await waitFor(() => {
      expect(screen.getByText("Mazhalai Textbook First Semester")).toBeInTheDocument();
    });

    // Change status filter
    fireEvent.change(screen.getByDisplayValue("Active"), { target: { value: "all" } });

    await waitFor(() => {
      expect(mockTextbookApi.adminGetTextbooks).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ status: "all" })
      );
    });
  });

  test("should display error message on API failure", async () => {
    mockTextbookApi.adminGetTextbooks.mockRejectedValue(new Error("Failed to fetch"));

    render(<AdminTextbooksPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });
});
