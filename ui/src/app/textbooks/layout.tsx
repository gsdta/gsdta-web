import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Textbooks",
  description: "GSDTA Tamil School textbooks and learning resources for all grades.",
  alternates: { canonical: "/textbooks/" },
  openGraph: {
    type: "website",
    url: "/textbooks/",
    title: "Textbooks | GSDTA Tamil School",
    description: "Textbooks and learning resources for all grades.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Textbooks | GSDTA Tamil School",
    description: "Textbooks and learning resources for all grades.",
    images: ["/images/logo.png"],
  },
};

export default function TextbooksLayout({ children }: { children: React.ReactNode }) {
  return children;
}

