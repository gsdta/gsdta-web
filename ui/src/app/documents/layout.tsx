import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
  description: "GSDTA Tamil School documents — bylaws, policies, and public resources.",
  alternates: { canonical: "/documents/" },
  openGraph: {
    type: "website",
    url: "/documents/",
    title: "Documents | GSDTA Tamil School",
    description: "Explore bylaws, policies, and public resources.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Documents | GSDTA Tamil School",
    description: "Explore bylaws, policies, and public resources.",
    images: ["/images/logo.png"],
  },
};

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

