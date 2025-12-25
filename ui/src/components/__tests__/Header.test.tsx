import {render, screen, fireEvent} from "@testing-library/react";
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
  // Look for both links and menuitems (dropdown items have role="menuitem")
  const links = screen.queryAllByRole("link");
  const menuItems = screen.queryAllByRole("menuitem");
  const allElements = [...links, ...menuItems];
  return allElements.some((el) => normalize((el as HTMLAnchorElement).getAttribute("href")) === expected);
}

// Static links that should be visible to all users
const staticLinks = ["/", "/about/", "/team/", "/documents/", "/calendar/", "/textbooks/", "/donate/"];

test("renders static nav links for authenticated users", () => {
  useAuth.mockReturnValue({
    user: { id: "u1", name: "Priya", email: "priya@example.com", role: "parent", roles: ["parent"] },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);
  expect(screen.getByText("GSDTA")).toBeInTheDocument();

  // All static links should be visible for authenticated users
  for (const link of staticLinks) {
    expect(hasLinkTo(link)).toBe(true);
  }

  // User dropdown should show user's name
  expect(screen.getByText("Priya")).toBeInTheDocument();
});

test("renders static nav links for anonymous users", () => {
  useAuth.mockReturnValue({
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);

  // All static links should be visible for anonymous users
  for (const link of staticLinks) {
    expect(hasLinkTo(link)).toBe(true);
  }

  // Sign-in visibility depends on auth mode; no assertion here
});

test("renders user dropdown with profile and logout for single-role user", () => {
  useAuth.mockReturnValue({
    user: { id: "u1", name: "Teacher Test", email: "teacher@example.com", role: "teacher", roles: ["teacher"] },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);

  // User's name should be visible (dropdown trigger)
  expect(screen.getByText("Teacher Test")).toBeInTheDocument();

  // Click to open the dropdown
  fireEvent.click(screen.getByText("Teacher Test"));

  // Profile and logout links should be in the dropdown
  expect(hasLinkTo("/profile")).toBe(true);
  expect(hasLinkTo("/logout")).toBe(true);

  // Switch role should NOT be visible for single-role user
  expect(hasLinkTo("/select-role")).toBe(false);
});

test("renders switch role option for multi-role user", () => {
  useAuth.mockReturnValue({
    user: { id: "u1", name: "Multi Role User", email: "multi@example.com", role: "admin", roles: ["admin", "teacher"] },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);

  // User's name should be visible
  expect(screen.getByText("Multi Role User")).toBeInTheDocument();

  // Click to open the dropdown
  fireEvent.click(screen.getByText("Multi Role User"));

  // Switch role should be visible for multi-role user
  expect(hasLinkTo("/select-role")).toBe(true);
  expect(hasLinkTo("/profile")).toBe(true);
  expect(hasLinkTo("/logout")).toBe(true);
});

test("renders dashboard link for authenticated parent user", () => {
  useAuth.mockReturnValue({
    user: { id: "u1", name: "Parent User", email: "parent@example.com", role: "parent", roles: ["parent"] },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);

  // Dashboard link should be visible and point to parent dashboard
  expect(hasLinkTo("/parent/dashboard")).toBe(true);
});

test("renders dashboard link for authenticated admin user", () => {
  useAuth.mockReturnValue({
    user: { id: "u1", name: "Admin User", email: "admin@example.com", role: "admin", roles: ["admin"] },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);

  // Dashboard link should be visible and point to admin dashboard
  expect(hasLinkTo("/admin")).toBe(true);
});

test("renders dashboard link for authenticated teacher user", () => {
  useAuth.mockReturnValue({
    user: { id: "u1", name: "Teacher User", email: "teacher@example.com", role: "teacher", roles: ["teacher"] },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);

  // Dashboard link should be visible and point to teacher dashboard
  expect(hasLinkTo("/teacher/dashboard")).toBe(true);
});

test("does not render dashboard link for anonymous users", () => {
  useAuth.mockReturnValue({
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    setRole: jest.fn(),
  });
  render(<Header />);

  // Dashboard links should not be present
  expect(hasLinkTo("/admin")).toBe(false);
  expect(hasLinkTo("/teacher/dashboard")).toBe(false);
  expect(hasLinkTo("/parent/dashboard")).toBe(false);
});
