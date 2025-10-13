import { render, screen } from "@testing-library/react";
import { Header } from "@/components/Header";
import "@testing-library/jest-dom";

test("renders header links", () => {
  render(<Header />);
  expect(screen.getByText("GSDTA")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /students/i })).toBeInTheDocument();
});
