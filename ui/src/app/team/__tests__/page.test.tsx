import { render, screen, fireEvent } from "@testing-library/react";
import TeamPage from "../page";
import "@testing-library/jest-dom";

describe("TeamPage", () => {
  test("renders team page title", () => {
    render(<TeamPage />);
    expect(screen.getByTestId("page-title")).toHaveTextContent("Team");
  });

  test("renders all 5 section navigation buttons", () => {
    render(<TeamPage />);
    expect(screen.getByRole("button", { name: "Board" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Executives" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teachers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volunteers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "FAQ" })).toBeInTheDocument();
  });

  test("shows Board section by default with board members", () => {
    render(<TeamPage />);
    const boardButton = screen.getByRole("button", { name: "Board" });
    expect(boardButton).toHaveClass("bg-green-700");

    // Check for board members
    expect(screen.getByText("Bala Jayaseelan")).toBeInTheDocument();
    expect(screen.getByText("Karthikeyan N.K")).toBeInTheDocument();
    expect(screen.getByText("Padma Swaminathan")).toBeInTheDocument();
    expect(screen.getByText("Devi Kumaradev")).toBeInTheDocument();
    expect(screen.getByText("Rajaraman Krishnan")).toBeInTheDocument();
  });

  test("switches to Executives section when clicked", () => {
    render(<TeamPage />);
    const executivesButton = screen.getByRole("button", { name: "Executives" });

    fireEvent.click(executivesButton);

    expect(executivesButton).toHaveClass("bg-green-700");
    expect(screen.getByText("Technology Committee")).toBeInTheDocument();
    expect(screen.getByText("Administration Committee")).toBeInTheDocument();
    expect(screen.getByText("Facilities Committee")).toBeInTheDocument();
    expect(screen.getByText("Marketing & Fund-raising Committee")).toBeInTheDocument();
  });

  test("switches to Teachers section and shows both teacher groups", () => {
    render(<TeamPage />);
    const teachersButton = screen.getByRole("button", { name: "Teachers" });

    fireEvent.click(teachersButton);

    expect(teachersButton).toHaveClass("bg-green-700");
    expect(screen.getByText("Our Teachers")).toBeInTheDocument();
    expect(screen.getByText("Assistant Teachers")).toBeInTheDocument();

    // Check for some teachers
    expect(screen.getByText("Rajini J")).toBeInTheDocument();
    expect(screen.getByText("Udayakumar Rajendran")).toBeInTheDocument();

    // Check for some assistant teachers
    expect(screen.getByText("Sujatha Karthikeyan")).toBeInTheDocument();
    expect(screen.getByText("Padma Swaminathan")).toBeInTheDocument();
  });

  test("shows coming soon message for Volunteers section", () => {
    render(<TeamPage />);
    const volunteersButton = screen.getByRole("button", { name: "Volunteers" });

    fireEvent.click(volunteersButton);

    expect(screen.getByText(/Volunteers are not available yet/i)).toBeInTheDocument();
  });

  test("shows coming soon message for FAQ section", () => {
    render(<TeamPage />);
    const faqButton = screen.getByRole("button", { name: "FAQ" });

    fireEvent.click(faqButton);

    expect(screen.getByText(/FAQ are not available yet/i)).toBeInTheDocument();
  });

  test("renders images for all board members", () => {
    render(<TeamPage />);

    const images = screen.getAllByRole("img");
    expect(images.length).toBeGreaterThan(0);

    // Check alt texts for board members
    expect(screen.getByAltText("Bala Jayaseelan")).toBeInTheDocument();
    expect(screen.getByAltText("Karthikeyan N.K")).toBeInTheDocument();
  });

  test("displays board member roles and locations", () => {
    render(<TeamPage />);

    const boardMemberRoles = screen.getAllByText("Board Member");
    expect(boardMemberRoles.length).toBeGreaterThan(0);
    expect(screen.getByText("Poway, CA")).toBeInTheDocument();
  });

  test("shows bio preview with More... button for board members", () => {
    render(<TeamPage />);

    // Check for bio preview (first 100 chars + "...")
    const moreButtons = screen.getAllByRole("button", { name: "More..." });
    expect(moreButtons.length).toBeGreaterThan(0);
  });

  test("expands board member detail view when More... is clicked", () => {
    render(<TeamPage />);

    const moreButtons = screen.getAllByRole("button", { name: "More..." });

    // Click the first More... button
    fireEvent.click(moreButtons[0]);

    // Check that detail view is shown with Close button
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();

    // Check that the heading is now shown as h3 with larger styling (detail view)
    const heading = screen.getAllByText(/Bala Jayaseelan/i)[0];
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H3");
  });

  test("closes detail view and returns to grid when Close is clicked", () => {
    render(<TeamPage />);

    const moreButtons = screen.getAllByRole("button", { name: "More..." });
    fireEvent.click(moreButtons[0]);

    // Verify detail view is open
    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton).toBeInTheDocument();

    // Click Close
    fireEvent.click(closeButton);

    // Verify we're back to grid view with More... buttons
    const moreButtonsAfter = screen.getAllByRole("button", { name: "More..." });
    expect(moreButtonsAfter.length).toBeGreaterThan(0);
  });

  test("navigation maintains active state correctly", () => {
    render(<TeamPage />);

    const boardButton = screen.getByRole("button", { name: "Board" });
    const executivesButton = screen.getByRole("button", { name: "Executives" });

    // Board is active by default
    expect(boardButton).toHaveClass("bg-green-700");
    expect(executivesButton).not.toHaveClass("bg-green-700");

    // Click Executives
    fireEvent.click(executivesButton);
    expect(executivesButton).toHaveClass("bg-green-700");
    expect(boardButton).not.toHaveClass("bg-green-700");

    // Click back to Board
    fireEvent.click(boardButton);
    expect(boardButton).toHaveClass("bg-green-700");
    expect(executivesButton).not.toHaveClass("bg-green-700");
  });

  test("committee tiles display all members", () => {
    render(<TeamPage />);
    const executivesButton = screen.getByRole("button", { name: "Executives" });

    fireEvent.click(executivesButton);

    // Check Technology Committee members
    expect(screen.getByText("Sriram Hariharan")).toBeInTheDocument();
    expect(screen.getByText("Ashok Annamalai")).toBeInTheDocument();
    expect(screen.getByText("Vinoth Deivasigamani")).toBeInTheDocument();
  });
});
