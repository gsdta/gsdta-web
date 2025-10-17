import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: true },
  alternates: { canonical: "/login/" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

