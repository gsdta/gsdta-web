import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logout",
  robots: { index: false, follow: false },
};

export default function LogoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

