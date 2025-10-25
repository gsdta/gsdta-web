import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import TextbooksPage from "../page";
import {
  TEXTBOOKS,
  buildGoogleDrivePreviewUrl,
} from "@/data/textbooks";

describe("TextbooksPage", () => {
  test("renders page title and instructions", () => {
    render(<TextbooksPage />);

    expect(screen.getByTestId("page-title")).toHaveTextContent(
      "Academic Year 2025-26 – Text Books",
    );
    expect(
      screen.getByText(
        /Choose a grade to explore textbooks and homework for the 2025-26 school year\./i,
      ),
    ).toBeInTheDocument();
  });

  test("shows resource prompt when a grade is selected", async () => {
    const user = userEvent.setup();
    render(<TextbooksPage />);

    const targetGrade = TEXTBOOKS[2];
    await user.click(screen.getByRole("tab", { name: targetGrade.label }));

    expect(
      screen.getByText(/Select a textbook or homework to view it\./i),
    ).toBeInTheDocument();
  });

  test("loads google drive preview after selecting a resource", async () => {
    const user = userEvent.setup();
    render(<TextbooksPage />);

    const targetGrade = TEXTBOOKS[1];
    await user.click(screen.getByRole("tab", { name: targetGrade.label }));

    const targetResource = targetGrade.resources[0];
    await user.click(
      screen.getByRole("button", { name: targetResource.label }),
    );

    const viewer = await screen.findByTestId("textbook-viewer");
    expect(viewer).toHaveAttribute(
      "src",
      buildGoogleDrivePreviewUrl(targetResource.googleDriveId),
    );
  });
});
