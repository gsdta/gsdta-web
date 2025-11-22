import {render, screen} from "@testing-library/react";
import {Header} from "@/components/Header";
import "@testing-library/jest-dom";

// Make useAuth a jest.fn so we can switch return values per test
jest.mock("@/components/AuthProvider", () => {
  return {
    useAuth: jest.fn(),
  };
});

const { useAuth } = jest.requireMock("@/components/AuthProvider");

function hasLinkTo(href: string): boolean {
  const normalize = (s: string | null) => {
    if (!s) return s;
    if (s !== "/" && s.endsWith("/")) return s.slice(0, -1);
    return s;
  };
  const expected = normalize(href);
  return screen
    .getAllByRole("link")
    .some((el) => normalize((el as HTMLAnchorElement).getAttribute("href")) === expected);
}

test("renders header links for parent role", () => {
  useAuth.mockReturnValue({
    user: { id: "u1", name: "Priya", email: "priya@example.com", role: "parent" },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);
  expect(screen.getByText("GSDTA")).toBeInTheDocument();
  expect(hasLinkTo("/students")).toBe(true);
  expect(hasLinkTo("/dashboard")).toBe(true);
  expect(hasLinkTo("/logout")).toBe(true);
});

test("renders public nav for anonymous users (sign-in link varies by auth mode)", () => {
  useAuth.mockReturnValue({
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);
  // Check presence of required public links by href (labels may be localized)
  expect(hasLinkTo("/about/")).toBe(true);
  expect(hasLinkTo("/team/")).toBe(true);
  expect(hasLinkTo("/documents/")).toBe(true);
  expect(hasLinkTo("/calendar/")).toBe(true);
  expect(hasLinkTo("/textbooks/")).toBe(true);
  expect(hasLinkTo("/donate/")).toBe(true);
  // Sign-in visibility depends on auth mode; no assertion here anymore.
});
