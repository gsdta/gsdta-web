import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Donate",
  description: "Support GSDTA Tamil School — make a donation to help Tamil language education.",
  alternates: { canonical: "/donate/" },
  openGraph: {
    type: "website",
    url: "/donate/",
    title: "Donate | GSDTA Tamil School",
    description: "Support GSDTA Tamil School with your donation.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Donate | GSDTA Tamil School",
    description: "Support GSDTA Tamil School with your donation.",
    images: ["/images/logo.png"],
  },
};

export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return children;
}

