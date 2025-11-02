import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeacherInviteForm } from "@/components/TeacherInviteForm";
import { useAuth } from "@/components/AuthProvider";

// Mock dependencies
jest.mock("@/components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  EFFECTIVE_BASE_URL: "http://localhost:8080/api",
  apiFetch: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("TeacherInviteForm", () => {
  const mockGetIdToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: { email: "admin@example.com" },
      getIdToken: mockGetIdToken,
      loginWithGoogle: jest.fn(),
      logout: jest.fn(),
      loading: false,
    } as any);

    mockGetIdToken.mockResolvedValue("admin-token-123");

    // Mock window.location.origin for invite link
    delete (window as any).location;
    window.location = { origin: "http://localhost:3000" } as any;
  });

  test("should render form with email and expiration inputs", () => {
    render(<TeacherInviteForm />);

    expect(screen.getByLabelText(/teacher email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expires in/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create invite/i })).toBeInTheDocument();
  });

  test("should have default expiration of 72 hours", () => {
    render(<TeacherInviteForm />);

    const expiresInput = screen.getByLabelText(/expires in/i) as HTMLInputElement;
    expect(expiresInput.value).toBe("72");
  });

  test("submit button should be disabled when email is empty", () => {
    render(<TeacherInviteForm />);

    const submitButton = screen.getByRole("button", { name: /create invite/i });
    expect(submitButton).toBeDisabled();
  });

  test("submit button should be enabled when email is provided", async () => {
    render(<TeacherInviteForm />);

    const emailInput = screen.getByLabelText(/teacher email/i);
    await userEvent.type(emailInput, "teacher@example.com");

    const submitButton = screen.getByRole("button", { name: /create invite/i });
    expect(submitButton).toBeEnabled();
  });

  test("should create invite successfully", async () => {
    const { apiFetch } = require("@/lib/api-client");

    apiFetch.mockResolvedValueOnce({
      id: "invite-123",
      email: "teacher@example.com",
      role: "teacher",
      status: "pending",
      token: "invite-token-abc",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });

    render(<TeacherInviteForm />);

    const emailInput = screen.getByLabelText(/teacher email/i);
    await userEvent.type(emailInput, "teacher@example.com");

    const submitButton = screen.getByRole("button", { name: /create invite/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invite created for teacher@example.com/i)).toBeInTheDocument();
    });

    // Should display invite link
    expect(screen.getByDisplayValue(/invite-token-abc/)).toBeInTheDocument();

    // Should clear email input after success
    expect(emailInput).toHaveValue("");
  });

  test("should call API with correct parameters", async () => {
    const { apiFetch } = require("@/lib/api-client");

    apiFetch.mockResolvedValueOnce({
      id: "invite-123",
      email: "teacher@example.com",
      role: "teacher",
      status: "pending",
      token: "invite-token-abc",
      expiresAt: new Date().toISOString(),
    });

    render(<TeacherInviteForm />);

    const emailInput = screen.getByLabelText(/teacher email/i);
    const expiresInput = screen.getByLabelText(/expires in/i);

    await userEvent.clear(expiresInput);
    await userEvent.type(expiresInput, "48");
    await userEvent.type(emailInput, "teacher@example.com");

    const submitButton = screen.getByRole("button", { name: /create invite/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/invites",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer admin-token-123",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            email: "teacher@example.com",
            role: "teacher",
            expiresInHours: 48,
          }),
        })
      );
    });
  });

  test("should display error when API call fails", async () => {
    const { apiFetch } = require("@/lib/api-client");

    apiFetch.mockRejectedValueOnce({ message: "Invalid email address" });

    render(<TeacherInviteForm />);

    const emailInput = screen.getByLabelText(/teacher email/i);
    await userEvent.type(emailInput, "invalid@email");

    const submitButton = screen.getByRole("button", { name: /create invite/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  test("should display error when not authenticated", async () => {
    mockGetIdToken.mockResolvedValueOnce(null);

    render(<TeacherInviteForm />);

    const emailInput = screen.getByLabelText(/teacher email/i);
    await userEvent.type(emailInput, "teacher@example.com");

    const submitButton = screen.getByRole("button", { name: /create invite/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    });
  });

  test("should show loading state while creating invite", async () => {
    const { apiFetch } = require("@/lib/api-client");

    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    apiFetch.mockReturnValueOnce(promise);

    render(<TeacherInviteForm />);

    const emailInput = screen.getByLabelText(/teacher email/i);
    await userEvent.type(emailInput, "teacher@example.com");

    const submitButton = screen.getByRole("button", { name: /create invite/i });
    await userEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByRole("button", { name: /creating/i })).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      id: "invite-123",
      email: "teacher@example.com",
      role: "teacher",
      status: "pending",
      token: "token",
      expiresAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText(/invite created/i)).toBeInTheDocument();
    });
  });

  test("should copy invite link to clipboard", async () => {
    const { apiFetch } = require("@/lib/api-client");
    const mockWriteText = jest.fn();
    
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    apiFetch.mockResolvedValueOnce({
      id: "invite-123",
      email: "teacher@example.com",
      role: "teacher",
      status: "pending",
      token: "invite-token-abc",
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });

    render(<TeacherInviteForm />);

    const emailInput = screen.getByLabelText(/teacher email/i);
    await userEvent.type(emailInput, "teacher@example.com");

    const submitButton = screen.getByRole("button", { name: /create invite/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    const copyButton = screen.getByRole("button", { name: /copy/i });
    await userEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(
      "http://localhost:3000/invite/accept?token=invite-token-abc"
    );
  });
});
