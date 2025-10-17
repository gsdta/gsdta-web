import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Register with GSDTA Tamil School — create an account and get started.",
  alternates: { canonical: "/register/" },
  openGraph: {
    type: "website",
    url: "/register/",
    title: "Register | GSDTA Tamil School",
    description: "Create an account and register with GSDTA.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Register | GSDTA Tamil School",
    description: "Create an account and register with GSDTA.",
    images: ["/images/logo.png"],
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}

