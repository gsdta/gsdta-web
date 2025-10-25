import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academic Year 2025-26 - Text Books",
  description:
    "Greater San Diego Tamil Academy (GSDTA) is a non-profit organization dedicated to promoting Tamil culture, language, and heritage in the Greater San Diego area through cultural events, education, and community programs.",
  keywords: [
    "San Diego Tamil School",
    "Tamil Academy",
    "GSDTA",
    "Tamil culture",
    "Tamil events San Diego",
    "Tamil community San Diego",
    "Tamil language classes",
    "Tamil cultural programs",
  ],
  alternates: { canonical: "https://www.gsdta.org/text-books" },
  openGraph: {
    type: "website",
    url: "https://www.gsdta.org/text-books",
    title: "Our School Syllabus",
    description: "Explore our school syllabus for students across grades.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Our School Syllabus",
    description: "Explore our school syllabus for students across grades.",
    images: ["/images/logo.png"],
  },
};

export default function TextbooksLayout({ children }: { children: React.ReactNode }) {
  return children;
}

