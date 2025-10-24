// filepath: c:\projects\gsdta\gsdta-web\ui\src\app\signin\layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
  alternates: { canonical: "/signin/" },
};

export default function SigninLayout({ children }: { children: React.ReactNode }) {
  return children;
}

