// filepath: c:\projects\gsdta\gsdta-web\ui\src\components\__tests__\Protected.test.tsx
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// We'll mock useAuth and next/navigation per test
jest.mock("@/components/AuthProvider", () => ({ useAuth: jest.fn() }));
const { useAuth } = jest.requireMock("@/components/AuthProvider");

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
const { useRouter } = jest.requireMock("next/navigation");

describe("Protected", () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
    // default to mock mode unless test overrides
    process.env.NEXT_PUBLIC_AUTH_MODE = "mock";
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("unauthenticated redirects to /login in mock mode and renders nothing", async () => {
    jest.useFakeTimers();
    const replace = jest.fn();
    useRouter.mockReturnValue({ replace });
    useAuth.mockReturnValue({ user: null, loading: false });

    const { Protected } = await import("@/components/Protected");

    render(
      <Protected>
        <div data-testid="secret">secret</div>
      </Protected>
    );

    // Nothing is rendered and redirect scheduled
    expect(screen.queryByTestId("secret")).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(replace).toHaveBeenCalledWith("/login");
  });

  test.skip("firebase mode with unverified email redirects to /signin and renders nothing", async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = "firebase";

    const replace = jest.fn();
    useRouter.mockReturnValue({ replace });
    useAuth.mockReturnValue({ user: { id: "u1", name: "A", email: "a@x", role: "parent", emailVerified: false }, loading: false });

    const { Protected } = await import("@/components/Protected");

    render(
      <Protected>
        <div data-testid="secret">secret</div>
      </Protected>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/signin?verify=true");
    }, { timeout: 3000 });
    expect(screen.queryByTestId("secret")).toBeNull();
  });

  test("role mismatch redirects to allowed landing and renders nothing", async () => {
    const replace = jest.fn();
    useRouter.mockReturnValue({ replace });
    useAuth.mockReturnValue({ user: { id: "u2", name: "T", email: "t@x", role: "teacher" }, loading: false });

    const { Protected } = await import("@/components/Protected");

    render(
      <Protected roles={["admin"]}>
        <div data-testid="secret">secret</div>
      </Protected>
    );

    expect(replace).toHaveBeenCalledWith("/teacher");
    expect(screen.queryByTestId("secret")).toBeNull();
  });

  test("allowed role renders children and does not redirect", async () => {
    const replace = jest.fn();
    useRouter.mockReturnValue({ replace });
    useAuth.mockReturnValue({ user: { id: "u3", name: "P", email: "p@x", role: "parent" }, loading: false });

    const { Protected } = await import("@/components/Protected");

    render(
      <Protected roles={["parent"]}>
        <div data-testid="secret">secret</div>
      </Protected>
    );

    expect(screen.getByTestId("secret")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
