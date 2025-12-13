import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminGradesPage from "@/app/admin/grades/page";
import { useAuth } from "@/components/AuthProvider";
import * as gradeApi from "@/lib/grade-api";

// Mock dependencies
jest.mock("@/components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/grade-api");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGradeApi = gradeApi as jest.Mocked<typeof gradeApi>;

describe("AdminGradesPage", () => {
  const mockGetIdToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { email: "admin@example.com" },
      getIdToken: mockGetIdToken,
    } as any);

    mockGetIdToken.mockResolvedValue("admin-token");
    
    // Default mocks
    mockGradeApi.adminGetGrades.mockResolvedValue({ grades: [], total: 0 });
    mockGradeApi.adminCheckGradesSeeded.mockResolvedValue(true);
  });

  test("should render loading state initially", async () => {
    // Delay resolution to check loading state
    mockGradeApi.adminGetGrades.mockImplementationOnce(() => new Promise(() => {}));
    
    const { container } = render(<AdminGradesPage />);
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test("should render empty state when no grades", async () => {
    render(<AdminGradesPage />);

    await waitFor(() => {
        expect(screen.getByText(/no grades found/i)).toBeInTheDocument();
    });
  });

  test("should render list of grades", async () => {
    const grades = [
        { id: 'g1', name: 'G1', displayName: 'Grade 1', displayOrder: 1, status: 'active' },
        { id: 'g2', name: 'G2', displayName: 'Grade 2', displayOrder: 2, status: 'inactive' }
    ] as any;

    mockGradeApi.adminGetGrades.mockResolvedValue({ grades, total: 2 });

    render(<AdminGradesPage />);

    await waitFor(() => {
        expect(screen.getByText('Grade 1')).toBeInTheDocument();
        expect(screen.getByText('Grade 2')).toBeInTheDocument();
    });

    // Check for status badges - might be multiple due to filter dropdown
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
  });

  test("should allow seeding if not seeded", async () => {
    mockGradeApi.adminCheckGradesSeeded.mockResolvedValue(false);
    mockGradeApi.adminSeedGrades.mockResolvedValue({ message: 'Seeded', created: 10, skipped: 0 });

    render(<AdminGradesPage />);

    await waitFor(() => {
        expect(screen.getAllByText(/seed default grades/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText(/seed default grades/i)[0]);

    await waitFor(() => {
        expect(mockGradeApi.adminSeedGrades).toHaveBeenCalled();
    });
  });
});
