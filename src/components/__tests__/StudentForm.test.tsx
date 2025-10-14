import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentForm } from "@/components/StudentForm";

describe("StudentForm", () => {
  it("shows validation errors on empty submit", async () => {
    const onSubmit = jest.fn();
    render(<StudentForm onSubmit={onSubmit} submitLabel="Create" />);

    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/last name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid data", async () => {
    const onSubmit = jest.fn();
    render(<StudentForm onSubmit={onSubmit} submitLabel="Create" />);

    await userEvent.type(screen.getByLabelText(/first name/i), "Kala");
    await userEvent.type(screen.getByLabelText(/last name/i), "S.");
    await userEvent.selectOptions(screen.getByLabelText(/prior level/i), "Beginner");
    await userEvent.click(screen.getByLabelText(/photo consent/i));
    await userEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Kala",
        lastName: "S.",
        priorLevel: "Beginner",
        photoConsent: true,
      }),
    );
  });
});
