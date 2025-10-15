import {render, screen} from "@testing-library/react";
import {Header} from "@/components/Header";
import "@testing-library/jest-dom";

jest.mock("@/components/AuthProvider", () => {
    return {
        useAuth: () => ({
            user: {id: "u1", name: "Priya", email: "priya@example.com", role: "parent"},
            loading: false,
            login: jest.fn(),
            logout: jest.fn(),
            setRole: jest.fn(),
        }),
    };
});

function hasLinkTo(href: string): boolean {
    return screen
        .getAllByRole("link")
        .some((el) => (el as HTMLAnchorElement).getAttribute("href") === href);
}

test("renders header links for parent role", () => {
    render(<Header/>);
    expect(screen.getByText("GSDTA")).toBeInTheDocument();
    expect(hasLinkTo("/students")).toBe(true);
    expect(hasLinkTo("/dashboard")).toBe(true);
    expect(hasLinkTo("/logout")).toBe(true);
});
