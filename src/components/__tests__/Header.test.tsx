import { render, screen } from "@testing-library/react";
import { Header } from "@/components/Header";
import "@testing-library/jest-dom";

jest.mock("@/components/AuthProvider", () => {
  return {
    useAuth: () => ({
      user: { id: "u1", name: "Priya", email: "priya@example.com", role: "parent" },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      setRole: jest.fn(),
    }),
  };
});

test("renders header links for parent role", () => {
  render(<Header />);
  expect(screen.getByText("GSDTA")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /students/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /logout/i })).toBeInTheDocument();
});
