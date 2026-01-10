import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminVolunteersPage from "../page";
import { useAuth } from "@/components/AuthProvider";
import * as volunteerApi from "@/lib/volunteer-api";

// Mock dependencies
jest.mock("@/components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/volunteer-api");

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockVolunteerApi = volunteerApi as jest.Mocked<typeof volunteerApi>;

describe("AdminVolunteersPage", () => {
  const mockGetIdToken = jest.fn();

  const mockVolunteers = [
    {
      id: "vol-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      phone: "555-123-4567",
      type: "high_school" as const,
      school: "Poway High School",
      gradeLevel: "11th",
      classAssignments: [],
      availableDays: ["Saturday", "Sunday"],
      status: "active" as const,
      academicYear: "2025-2026",
      totalHours: 25,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "vol-2",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@test.com",
      type: "parent" as const,
      classAssignments: [
        { classId: "c1", className: "PS-1 A", gradeId: "ps-1", assignedAt: "2024-01-01", assignedBy: "admin" },
      ],
      status: "active" as const,
      academicYear: "2025-2026",
      totalHours: 10,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "vol-3",
      firstName: "Bob",
      lastName: "Community",
      email: "bob@community.org",
      type: "community" as const,
      classAssignments: [],
      status: "inactive" as const,
      academicYear: "2025-2026",
      totalHours: 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { email: "admin@example.com", roles: ["admin"] },
      getIdToken: mockGetIdToken,
    } as any);

    mockGetIdToken.mockResolvedValue("admin-token");

    // Default mocks
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({ volunteers: [], total: 0 });
  });

  test("should render loading state initially", async () => {
    // Delay resolution to check loading state
    mockVolunteerApi.adminGetVolunteers.mockImplementationOnce(() => new Promise(() => {}));

    const { container } = render(<AdminVolunteersPage />);
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  test("should render empty state when no volunteers", async () => {
    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText(/no volunteers found/i)).toBeInTheDocument();
    });
  });

  test("should render list of volunteers", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: mockVolunteers,
      total: 3,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Bob Community")).toBeInTheDocument();
    });

    // Check volunteer types are displayed
    expect(screen.getByText("HS")).toBeInTheDocument();
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  test("should display class assignment count", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: mockVolunteers,
      total: 3,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("1 class(es)")).toBeInTheDocument();
    });
  });

  test("should display volunteer hours", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: mockVolunteers,
      total: 3,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("25 hrs")).toBeInTheDocument();
      expect(screen.getByText("10 hrs")).toBeInTheDocument();
      expect(screen.getByText("0 hrs")).toBeInTheDocument();
    });
  });

  test("should open create modal when Add Volunteer is clicked", async () => {
    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText(/no volunteers found/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Add Volunteer"));

    await waitFor(() => {
      expect(screen.getByText("Add New Volunteer")).toBeInTheDocument();
    });
  });

  test("should show create form in modal", async () => {
    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("Add Volunteer")).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByText("Add Volunteer"));

    await waitFor(() => {
      expect(screen.getByText("Add New Volunteer")).toBeInTheDocument();
    });

    // Check form elements are present - school input is visible because default type is high_school
    expect(screen.getByPlaceholderText(/Poway High School/i)).toBeInTheDocument();
    // Check that type options exist (multiple instances due to filter dropdown)
    expect(screen.getAllByText("High School Volunteer").length).toBeGreaterThan(0);

    // Close modal
    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Add New Volunteer")).not.toBeInTheDocument();
    });
  });

  test("should display volunteer names in table", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: [mockVolunteers[0]],
      total: 1,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  test("should have Add Volunteer button", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: [mockVolunteers[0]],
      total: 1,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Add Volunteer button should be present
    expect(screen.getByText("Add Volunteer")).toBeInTheDocument();
  });

  test("should display volunteer contact info", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: [mockVolunteers[0]],
      total: 1,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("john@test.com")).toBeInTheDocument();
    });
  });

  test("should filter volunteers by type", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: mockVolunteers,
      total: 3,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Change type filter
    fireEvent.change(screen.getByDisplayValue("All Types"), { target: { value: "high_school" } });

    await waitFor(() => {
      expect(mockVolunteerApi.adminGetVolunteers).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ type: "high_school" })
      );
    });
  });

  test("should filter volunteers by status", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: mockVolunteers,
      total: 3,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Change status filter
    fireEvent.change(screen.getByDisplayValue("Active"), { target: { value: "all" } });

    await waitFor(() => {
      expect(mockVolunteerApi.adminGetVolunteers).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ status: "all" })
      );
    });
  });

  test("should search volunteers by name", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: mockVolunteers,
      total: 3,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Type in search box
    fireEvent.change(screen.getByPlaceholderText(/search by name/i), {
      target: { value: "John" },
    });

    // The search should trigger a new fetch with search term
    await waitFor(() => {
      expect(mockVolunteerApi.adminGetVolunteers).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ search: "John" })
      );
    });
  });

  test("should display error message on API failure", async () => {
    mockVolunteerApi.adminGetVolunteers.mockRejectedValue(new Error("Failed to fetch"));

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  test("should show school and grade for high school volunteers", async () => {
    mockVolunteerApi.adminGetVolunteers.mockResolvedValue({
      volunteers: [mockVolunteers[0]],
      total: 1,
    });

    render(<AdminVolunteersPage />);

    await waitFor(() => {
      expect(screen.getByText("Poway High School")).toBeInTheDocument();
      expect(screen.getByText("11th")).toBeInTheDocument();
    });
  });
});
