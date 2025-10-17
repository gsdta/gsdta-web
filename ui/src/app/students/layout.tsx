import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Students",
  description: "Resources for GSDTA Tamil School students.",
  alternates: { canonical: "/students/" },
  openGraph: {
    type: "website",
    url: "/students/",
    title: "Students | GSDTA Tamil School",
    description: "Resources for students.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Students | GSDTA Tamil School",
    description: "Resources for students.",
    images: ["/images/logo.png"],
  },
  robots: { index: false, follow: false },
};

export default function StudentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
