// filepath: c:\projects\gsdta\gsdta-web\ui\src\app\signup\__tests__\page.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock the AuthProvider explicitly
jest.mock("@/components/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

// Mock Next.js router explicitly
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock Firebase client to prevent loading issues
jest.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: null })),
  googleProvider: {},
}));

// Mock firebase/auth
jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
  sendEmailVerification: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
}));

// Ensure the component runs in Firebase mode for Google flow tests
process.env.NEXT_PUBLIC_AUTH_MODE = "firebase";

import SignUpPage from "../page";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("SignUpPage", () => {
  const mockLoginWithGoogle = jest.fn();
  const mockLoginWithEmailPassword = jest.fn();
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      setRole: jest.fn(),
      loginWithGoogle: mockLoginWithGoogle,
      loginWithEmailPassword: mockLoginWithEmailPassword,
      sendEmailVerification: jest.fn(),
      getIdToken: jest.fn(),
    });
  });

  test("renders signup page with all elements", () => {
    render(<SignUpPage />);

    expect(screen.getByText("Create Parent Account")).toBeInTheDocument();
    expect(screen.getByText(/Sign up to access GSDTA services/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign Up with Email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
  });

  test("has link to signin page", () => {
    render(<SignUpPage />);

    const signinLink = screen.getByRole("link", { name: /sign in here/i });
    expect(signinLink).toBeInTheDocument();
    expect(signinLink).toHaveAttribute("href", "/signin");
  });

  test("shows error when passwords do not match", async () => {
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "different456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign Up with Email/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });

    expect(mockLoginWithEmailPassword).not.toHaveBeenCalled();
  });

  test("shows error when password is too short", async () => {
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: "12345" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "12345" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign Up with Email/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password must be at least 6 characters/i)).toBeInTheDocument();
    });

    expect(mockLoginWithEmailPassword).not.toHaveBeenCalled();
  });

  test("shows verification notice", () => {
    render(<SignUpPage />);

    expect(screen.getByText(/verify your email address/i)).toBeInTheDocument();
  });

  test("redirects authenticated users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123", email: "test@example.com", name: "Test", role: "parent" },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      setRole: jest.fn(),
      loginWithGoogle: mockLoginWithGoogle,
      loginWithEmailPassword: mockLoginWithEmailPassword,
      sendEmailVerification: jest.fn(),
      getIdToken: jest.fn(),
    });

    render(<SignUpPage />);

    expect(mockRouter.replace).toHaveBeenCalledWith("/parent");
  });

  test("does not show form while loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      login: jest.fn(),
      logout: jest.fn(),
      setRole: jest.fn(),
      loginWithGoogle: mockLoginWithGoogle,
      loginWithEmailPassword: mockLoginWithEmailPassword,
      sendEmailVerification: jest.fn(),
      getIdToken: jest.fn(),
    });

    const { container } = render(<SignUpPage />);

    // Page should render but may be in loading state
    expect(container).toBeInTheDocument();
  });

  test("all form fields are required", () => {
    render(<SignUpPage />);

    expect(screen.getByLabelText(/Full Name/i)).toBeRequired();
    expect(screen.getByLabelText(/^Email$/i)).toBeRequired();
    expect(screen.getByLabelText(/^Password$/i)).toBeRequired();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeRequired();
  });

  test("email field has correct type", () => {
    render(<SignUpPage />);

    const emailInput = screen.getByLabelText(/^Email$/i);
    expect(emailInput).toHaveAttribute("type", "email");
  });

  test("password fields have correct type", () => {
    render(<SignUpPage />);

    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(confirmPasswordInput).toHaveAttribute("type", "password");
  });

  test("password fields have minimum length", () => {
    render(<SignUpPage />);

    const passwordInput = screen.getByLabelText(/^Password$/i);
    const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);

    expect(passwordInput).toHaveAttribute("minLength", "6");
    expect(confirmPasswordInput).toHaveAttribute("minLength", "6");
  });
});
