import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AcceptInvitePage from "@/app/invite/accept/page";
import { useAuth } from "@/components/AuthProvider";
import { useSearchParams, useRouter } from "next/navigation";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@/components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  EFFECTIVE_BASE_URL: "http://localhost:8080/api",
  apiFetch: jest.fn(),
}));

const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("AcceptInvitePage", () => {
  const mockReplace = jest.fn();
  const mockLoginWithGoogle = jest.fn();
  const mockGetIdToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    mockUseAuth.mockReturnValue({
      user: null,
      loginWithGoogle: mockLoginWithGoogle,
      getIdToken: mockGetIdToken,
      logout: jest.fn(),
      loading: false,
    } as any);
  });

  test("should display error when token is missing", async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    } as any);

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByText(/missing invite token/i)).toBeInTheDocument();
    });
  });

  test("should verify invite token on mount", async () => {
    const { apiFetch } = require("@/lib/api-client");
    const mockToken = "test-token-123";

    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(mockToken),
    } as any);

    apiFetch.mockResolvedValueOnce({
      id: "invite-123",
      email: "teacher@example.com",
      role: "teacher",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getAllByText(/teacher@example.com/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Role:/i)).toBeInTheDocument();
    });

    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/v1/invites/verify?token=${mockToken}`),
      expect.objectContaining({ rawUrl: true })
    );
  });

  test("should display error when invite is invalid", async () => {
    const { apiFetch } = require("@/lib/api-client");

    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue("invalid-token"),
    } as any);

    apiFetch.mockRejectedValueOnce(new Error("Not found"));

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByText(/invite not found or expired/i)).toBeInTheDocument();
    });
  });

  test("should show accept button when invite is valid", async () => {
    const { apiFetch } = require("@/lib/api-client");

    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue("test-token"),
    } as any);

    mockUseAuth.mockReturnValue({
      user: { email: "teacher@example.com" },
      loginWithGoogle: mockLoginWithGoogle,
      getIdToken: mockGetIdToken,
      logout: jest.fn(),
      loading: false,
    } as any);

    apiFetch.mockResolvedValueOnce({
      id: "invite-123",
      email: "teacher@example.com",
      role: "teacher",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /accept invite/i })).toBeInTheDocument();
    });
  });

  test("should prompt Google sign-in when user email doesn't match", async () => {
    const { apiFetch } = require("@/lib/api-client");

    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue("test-token"),
    } as any);

    mockUseAuth.mockReturnValue({
      user: { email: "wrong@example.com" },
      loginWithGoogle: mockLoginWithGoogle,
      getIdToken: mockGetIdToken,
      logout: jest.fn(),
      loading: false,
    } as any);

    apiFetch.mockResolvedValueOnce({
      id: "invite-123",
      email: "teacher@example.com",
      role: "teacher",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByText(/please sign in with google using the invited email/i)).toBeInTheDocument();
    });
  });

  test("should accept invite and redirect on success", async () => {
    const { apiFetch } = require("@/lib/api-client");
    const mockToken = "test-token";

    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(mockToken),
    } as any);

    mockUseAuth.mockReturnValue({
      user: { email: "teacher@example.com" },
      loginWithGoogle: mockLoginWithGoogle,
      getIdToken: mockGetIdToken.mockResolvedValue("id-token-123"),
      logout: jest.fn(),
      loading: false,
    } as any);

    apiFetch
      .mockResolvedValueOnce({
        id: "invite-123",
        email: "teacher@example.com",
        role: "teacher",
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .mockResolvedValueOnce({
        uid: "teacher-uid",
        email: "teacher@example.com",
        roles: ["teacher"],
        status: "active",
      });

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /accept invite/i })).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole("button", { name: /accept invite/i });
    await userEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(/invite accepted/i)).toBeInTheDocument();
    });

    // Should call accept endpoint
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/invites/accept"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ token: mockToken }),
        headers: expect.objectContaining({
          Authorization: "Bearer id-token-123",
        }),
      })
    );

    // Should redirect after delay
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/teacher");
    }, { timeout: 1000 });
  });

  test("should display error when accept fails", async () => {
    const { apiFetch } = require("@/lib/api-client");

    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue("test-token"),
    } as any);

    mockUseAuth.mockReturnValue({
      user: { email: "teacher@example.com" },
      loginWithGoogle: mockLoginWithGoogle,
      getIdToken: mockGetIdToken.mockResolvedValue("id-token-123"),
      logout: jest.fn(),
      loading: false,
    } as any);

    apiFetch
      .mockResolvedValueOnce({
        id: "invite-123",
        email: "teacher@example.com",
        role: "teacher",
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .mockRejectedValueOnce({ message: "Email mismatch" });

    render(<AcceptInvitePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /accept invite/i })).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole("button", { name: /accept invite/i });
    await userEvent.click(acceptButton);

    await waitFor(() => {
      expect(screen.getByText(/email mismatch/i)).toBeInTheDocument();
    });
  });
});
