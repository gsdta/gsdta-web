import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/Footer";
import "@testing-library/jest-dom";

// Mock i18n provider
jest.mock("@/i18n/LanguageProvider", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "footer.orgTitle": "Organization",
        "footer.aboutUs": "About Us",
        "footer.registerNow": "Registration Open Now",
        "footer.teamTitle": "Team",
        "footer.board": "Board Members",
        "footer.executives": "Executive Committee",
        "footer.teachers": "Teachers",
        "footer.documentsTitle": "Documents",
        "footer.taxExempt": "Tax Exempt",
        "footer.bylaws": "Bylaws",
        "footer.contactTitle": "Contact",
        "footer.rights": "All rights reserved.",
      };
      return translations[key] || key;
    },
    locale: "en",
    setLocale: jest.fn(),
  }),
}));

describe("Footer", () => {
  test("renders footer with all sections", () => {
    render(<Footer />);

    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
  });

  test("renders organization links", () => {
    render(<Footer />);

    expect(screen.getByText("About Us")).toBeInTheDocument();
    expect(screen.getByText("Registration Open Now")).toBeInTheDocument();
  });

  test("renders team navigation links with correct hrefs", () => {
    render(<Footer />);

    const boardLink = screen.getByRole("link", { name: "Board Members" });
    const executivesLink = screen.getByRole("link", { name: "Executive Committee" });
    const teachersLink = screen.getByRole("link", { name: "Teachers" });

    expect(boardLink).toHaveAttribute("href", "/team?tab=board#board");
    expect(executivesLink).toHaveAttribute("href", "/team?tab=executives#executives");
    expect(teachersLink).toHaveAttribute("href", "/team?tab=teachers#teachers");
  });

  test("renders contact email as clickable mailto link", () => {
    render(<Footer />);

    const emailLink = screen.getByRole("link", { name: "communications@gsdta.org" });
    expect(emailLink).toHaveAttribute("href", "mailto:communications@gsdta.org");
  });

  // Test for issue #233 fix - phone number should NOT be a clickable link
  test("renders phone number as plain text, not as a clickable tel: link", () => {
    render(<Footer />);

    // Phone number should be displayed
    expect(screen.getByText("619-630-8499")).toBeInTheDocument();

    // But it should NOT be a link (no tel: href)
    const phoneLinks = screen.queryAllByRole("link").filter(
      (link) => (link as HTMLAnchorElement).href?.startsWith("tel:")
    );
    expect(phoneLinks).toHaveLength(0);
  });

  test("renders social media links", () => {
    render(<Footer />);

    const facebookLink = screen.getByRole("link", { name: "Facebook" });
    const twitterLink = screen.getByRole("link", { name: "Twitter" });
    const instagramLink = screen.getByRole("link", { name: "Instagram" });
    const linkedinLink = screen.getByRole("link", { name: "LinkedIn" });

    expect(facebookLink).toHaveAttribute("href", "https://facebook.com");
    expect(twitterLink).toHaveAttribute("href", "https://twitter.com");
    expect(instagramLink).toHaveAttribute("href", "https://instagram.com");
    expect(linkedinLink).toHaveAttribute("href", "https://linkedin.com");
  });

  test("renders copyright with current year", () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument();
  });

  test("renders GSDTA logo linking to home", () => {
    render(<Footer />);

    // Check that there's a link to the home page (logo)
    const homeLinks = screen.getAllByRole("link").filter(
      (link) => (link as HTMLAnchorElement).getAttribute("href") === "/"
    );
    expect(homeLinks.length).toBeGreaterThan(0);
  });
});
