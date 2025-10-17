import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact GSDTA Tamil School — get in touch with our team.",
  alternates: { canonical: "/contact/" },
  openGraph: {
    type: "website",
    url: "/contact/",
    title: "Contact | GSDTA Tamil School",
    description: "Get in touch with GSDTA Tamil School.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Contact | GSDTA Tamil School",
    description: "Get in touch with GSDTA Tamil School.",
    images: ["/images/logo.png"],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}

