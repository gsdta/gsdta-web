import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "About the Greater San Diego Tamil Academy (GSDTA) — mission and core values.",
  alternates: { canonical: "/about/" },
  openGraph: {
    type: "website",
    url: "/about/",
    title: "About Us | GSDTA Tamil School",
    description:
      "Learn about GSDTA's mission and core values fostering Tamil language and culture.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "About Us | GSDTA Tamil School",
    description:
      "Learn about GSDTA's mission and core values fostering Tamil language and culture.",
    images: ["/images/logo.png"],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

