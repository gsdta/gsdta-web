import { render, screen, fireEvent } from "@testing-library/react";
import { UserDropdown, UserDropdownMobile } from "@/components/UserDropdown";
import "@testing-library/jest-dom";

// Mock useAuth
jest.mock("@/components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

const { useAuth } = jest.requireMock("@/components/AuthProvider");

function hasLinkTo(href: string): boolean {
  // Look for both links and menuitems (dropdown items have role="menuitem")
  const links = screen.queryAllByRole("link");
  const menuItems = screen.queryAllByRole("menuitem");
  const allElements = [...links, ...menuItems];
  return allElements.some((el) => (el as HTMLAnchorElement).getAttribute("href") === href);
}

describe("UserDropdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns null when user is not logged in", () => {
    useAuth.mockReturnValue({ user: null });
    const { container } = render(<UserDropdown />);
    expect(container.firstChild).toBeNull();
  });

  test("shows user name as dropdown trigger", () => {
    useAuth.mockReturnValue({
      user: { id: "u1", name: "John Doe", email: "john@example.com", role: "parent", roles: ["parent"] },
    });
    render(<UserDropdown />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  test("opens dropdown on click and shows Profile and Logout", () => {
    useAuth.mockReturnValue({
      user: { id: "u1", name: "John Doe", email: "john@example.com", role: "parent", roles: ["parent"] },
    });
    render(<UserDropdown />);

    // Click to open dropdown
    fireEvent.click(screen.getByText("John Doe"));

    // Check menu items are visible
    expect(hasLinkTo("/profile")).toBe(true);
    expect(hasLinkTo("/logout")).toBe(true);
  });

  test("does NOT show Switch Role for single-role user", () => {
    useAuth.mockReturnValue({
      user: { id: "u1", name: "John Doe", email: "john@example.com", role: "parent", roles: ["parent"] },
    });
    render(<UserDropdown />);

    // Click to open dropdown
    fireEvent.click(screen.getByText("John Doe"));

    // Switch role should not be present
    expect(hasLinkTo("/select-role")).toBe(false);
  });

  test("shows Switch Role for multi-role user", () => {
    useAuth.mockReturnValue({
      user: { id: "u1", name: "Admin Teacher", email: "admin@example.com", role: "admin", roles: ["admin", "teacher"] },
    });
    render(<UserDropdown />);

    // Click to open dropdown
    fireEvent.click(screen.getByText("Admin Teacher"));

    // Switch role should be present
    expect(hasLinkTo("/select-role")).toBe(true);
    expect(hasLinkTo("/profile")).toBe(true);
    expect(hasLinkTo("/logout")).toBe(true);
  });

  test("closes dropdown when clicking outside", () => {
    useAuth.mockReturnValue({
      user: { id: "u1", name: "John Doe", email: "john@example.com", role: "parent", roles: ["parent"] },
    });
    render(<UserDropdown />);

    // Open dropdown
    fireEvent.click(screen.getByText("John Doe"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click outside (simulate mousedown event outside)
    fireEvent.mouseDown(document.body);

    // Dropdown should be closed
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  test("closes dropdown on Escape key", () => {
    useAuth.mockReturnValue({
      user: { id: "u1", name: "John Doe", email: "john@example.com", role: "parent", roles: ["parent"] },
    });
    render(<UserDropdown />);

    // Open dropdown
    fireEvent.click(screen.getByText("John Doe"));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // Dropdown should be closed
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("UserDropdownMobile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns null when user is not logged in", () => {
    useAuth.mockReturnValue({ user: null });
    const { container } = render(<UserDropdownMobile />);
    expect(container.firstChild).toBeNull();
  });

  test("shows user name and all menu items for single-role user", () => {
    useAuth.mockReturnValue({
      user: { id: "u1", name: "Jane Doe", email: "jane@example.com", role: "teacher", roles: ["teacher"] },
    });
    render(<UserDropdownMobile />);

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(hasLinkTo("/profile")).toBe(true);
    expect(hasLinkTo("/logout")).toBe(true);
    expect(hasLinkTo("/select-role")).toBe(false);
  });

  test("shows Switch Role for multi-role user", () => {
    useAuth.mockReturnValue({
      user: { id: "u1", name: "Multi User", email: "multi@example.com", role: "parent", roles: ["parent", "admin"] },
    });
    render(<UserDropdownMobile />);

    expect(hasLinkTo("/select-role")).toBe(true);
  });

  test("calls onItemClick when a link is clicked", () => {
    const onItemClick = jest.fn();
    useAuth.mockReturnValue({
      user: { id: "u1", name: "Test User", email: "test@example.com", role: "parent", roles: ["parent"] },
    });
    render(<UserDropdownMobile onItemClick={onItemClick} />);

    // Click on Profile link
    const profileLink = screen.getByRole("link", { name: /profile/i });
    fireEvent.click(profileLink);

    expect(onItemClick).toHaveBeenCalledTimes(1);
  });
});
