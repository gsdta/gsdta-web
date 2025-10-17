import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enrollment",
  description: "How to enroll at GSDTA Tamil School — registration steps and eligibility.",
  alternates: { canonical: "/enrollment/" },
  openGraph: {
    type: "website",
    url: "/enrollment/",
    title: "Enrollment | GSDTA Tamil School",
    description: "Learn how to enroll at GSDTA Tamil School.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Enrollment | GSDTA Tamil School",
    description: "Learn how to enroll at GSDTA Tamil School.",
    images: ["/images/logo.png"],
  },
};

export default function EnrollmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}

