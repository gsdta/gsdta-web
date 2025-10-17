import { render, screen } from "@testing-library/react";
import AboutPage from "../page";
import "@testing-library/jest-dom";

describe("AboutPage", () => {
  test("renders about page title", () => {
    render(<AboutPage />);
    expect(screen.getByTestId("page-title")).toHaveTextContent("About Us");
  });
});

