import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "@/app/register/page";

function getNextButton() {
  return screen.getByRole("button", { name: /next/i });
}
function getSubmitButton() {
  return screen.getByRole("button", { name: /submit registration/i });
}

describe("RegisterPage - multi-step behavior", () => {
  beforeEach(() => {
    // Clean persisted state between tests
    localStorage.clear();
    // Reset fetch mock
    // Ensure type remains consistent without using 'any'
    (global as unknown as { fetch: typeof fetch | undefined }).fetch = undefined;
  });

  test("disables Next until current step is valid and shows fade animation class", async () => {
    render(<RegisterPage />);

    // Page title renders
    expect(await screen.findByTestId("page-title")).toHaveTextContent(/register/i);

    // There's a fade-step animation wrapper when a step renders
    expect(document.querySelectorAll(".fade-step").length).toBeGreaterThan(0);

    // Initially, Next should end up disabled after validation effect runs
    await waitFor(() => expect(getNextButton()).toBeDisabled());

    // Fill required fields on step 0
    await userEvent.type(screen.getByLabelText(/student name/i), "Alice Johnson");
    // Date input in ISO format
    const dob = screen.getByLabelText(/student dob/i) as HTMLInputElement;
    fireEvent.change(dob, { target: { value: "2015-01-02" } });
    await userEvent.click(screen.getByLabelText(/girl/i));

    // Now Next should become enabled
    await waitFor(() => expect(getNextButton()).toBeEnabled());
  });

  test("clicking next step badge is guarded by validation; maxReached allows back/visited navigation", async () => {
    render(<RegisterPage />);

    // Attempt to jump to School step via badge while invalid -> should stay on Student
    const schoolBadge = screen.getByRole("button", { name: /go to school/i });
    await userEvent.click(schoolBadge);
    expect(screen.getByText(/student information/i)).toBeInTheDocument();

    // Make student step valid and use badge to go next (will pass validation)
    await userEvent.type(screen.getByLabelText(/student name/i), "Alice Johnson");
    const dob = screen.getByLabelText(/student dob/i) as HTMLInputElement;
    fireEvent.change(dob, { target: { value: "2015-01-02" } });
    await userEvent.click(screen.getByLabelText(/girl/i));

    await userEvent.click(schoolBadge);
    expect(await screen.findByText(/school information/i)).toBeInTheDocument();

    // Try to jump ahead to Parents while School step invalid -> should remain on School
    const parentsBadge = screen.getByRole("button", { name: /go to parents/i });
    await userEvent.click(parentsBadge);
    expect(screen.getByText(/school information/i)).toBeInTheDocument();

    // But we can click back to Student (visited step)
    const studentBadge = screen.getByRole("button", { name: /go to student/i });
    await userEvent.click(studentBadge);
    expect(await screen.findByText(/student information/i)).toBeInTheDocument();
  });

  test("persists values and current step to localStorage and restores on mount", async () => {
    const { unmount } = render(<RegisterPage />);

    // Enter a couple of values and advance to School step
    await userEvent.type(screen.getByLabelText(/student name/i), "Alice Johnson");
    const dob = screen.getByLabelText(/student dob/i) as HTMLInputElement;
    fireEvent.change(dob, { target: { value: "2015-01-02" } });
    await userEvent.click(screen.getByLabelText(/girl/i));
    await waitFor(() => expect(getNextButton()).toBeEnabled());
    await userEvent.click(getNextButton());
    expect(await screen.findByText(/school information/i)).toBeInTheDocument();

    // Unmount and remount (simulates refresh)
    unmount();
    render(<RegisterPage />);

    // Should restore step and values
    expect(await screen.findByText(/school information/i)).toBeInTheDocument();

    // Go back to Student to verify restored field value
    const studentBadge = screen.getByRole("button", { name: /go to student/i });
    await userEvent.click(studentBadge);
    const name = screen.getByLabelText(/student name/i) as HTMLInputElement;
    expect(name.value).toBe("Alice Johnson");
  });

  test("submits mapped payload to API with DOB parts and Other district handling", async () => {
    // Create a typed mock fetch that returns a minimal Response-like object (avoids global Response)
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as unknown as Response;
    const mockFetch = jest.fn(async (..._args: Parameters<typeof fetch>) => mockResponse) as jest.MockedFunction<typeof fetch>;
    (global as unknown as { fetch: typeof fetch }).fetch = mockFetch;

    render(<RegisterPage />);

    // Step 0 - Student
    await userEvent.type(screen.getByLabelText(/student name/i), "Alice Johnson");
    const dob = screen.getByLabelText(/student dob/i) as HTMLInputElement;
    fireEvent.change(dob, { target: { value: "2015-01-02" } });
    await userEvent.click(screen.getByLabelText(/girl/i));
    await waitFor(() => expect(getNextButton()).toBeEnabled());
    await userEvent.click(getNextButton());

    // Step 1 - School
    await userEvent.type(screen.getByLabelText(/current public school name/i), "Park Village Elementary School");
    await userEvent.selectOptions(screen.getByLabelText(/your school district/i), ["Other"]);
    // The other input shows up when 'Other' selected
    await userEvent.type(screen.getByPlaceholderText(/if other, please specify/i), "Some District");
    await userEvent.selectOptions(screen.getByLabelText(/current grade in public school/i), ["Grade-2"]);
    await userEvent.selectOptions(screen.getByLabelText(/last year grade in tamil school/i), ["KG"]);
    await userEvent.selectOptions(screen.getByLabelText(/enrolling grade in tamil school/i), ["Grade-1"]);
    await waitFor(() => expect(getNextButton()).toBeEnabled());
    await userEvent.click(getNextButton());

    // Step 2 - Parents
    await userEvent.type(screen.getByLabelText(/mother's name/i), "Jane Johnson");
    await userEvent.type(screen.getByLabelText(/mother's email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/mother's mobile/i), "1234567890");
    await userEvent.type(screen.getByLabelText(/mother's employer/i), "ACME");

    await userEvent.type(screen.getByLabelText(/father's name/i), "John Johnson");
    await userEvent.type(screen.getByLabelText(/father's email/i), "john@example.com");
    await userEvent.type(screen.getByLabelText(/father's mobile/i), "9876543210");
    await userEvent.type(screen.getByLabelText(/father's employer/i), "Wayne");
    await waitFor(() => expect(getNextButton()).toBeEnabled());
    await userEvent.click(getNextButton());

    // Step 3 - Address
    await userEvent.type(screen.getByLabelText(/street name and unit/i), "123 Main St #4");
    await userEvent.type(screen.getByLabelText(/^city$/i), "San Diego");
    await userEvent.type(screen.getByLabelText(/^zip$/i), "92129");

    await userEvent.click(getSubmitButton());

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const call = (mockFetch as jest.Mock).mock.calls[0];
    expect(call[0]).toBe("/api/google-form");
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body).toHaveProperty("data");
    const data = body.data as Record<string, string>;

    // Validate some known entries (IDs come from config)
    expect(Object.values(data)).toEqual(expect.arrayContaining([
      "Alice Johnson",
      "Jane Johnson",
      "john@example.com",
      "123 Main St #4",
      "San Diego",
      "92129",
    ]));

    // DOB parts: year, month (no leading zero), day (no leading zero)
    expect(Object.values(data)).toEqual(expect.arrayContaining(["2015", "1", "2"]));

    // District other handling: the special value and other response must be present
    // Ensure either the special marker or the other text exists
    expect(Object.values(data)).toEqual(expect.arrayContaining(["__other_option__", "Some District"]));

    // Success message appears
    expect(await screen.findByText(/registration submitted/i)).toBeInTheDocument();
  });
});
