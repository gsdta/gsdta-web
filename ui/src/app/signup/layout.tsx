// filepath: c:\projects\gsdta\gsdta-web\ui\src\app\signup\layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - GSDTA",
  description: "Create a parent account to access GSDTA services",
  alternates: { canonical: "/signup/" },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}

