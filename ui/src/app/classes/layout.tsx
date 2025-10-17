import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classes",
  description: "GSDTA Tamil School classes — grades, curriculum, and learning paths.",
  alternates: { canonical: "/classes/" },
  openGraph: {
    type: "website",
    url: "/classes/",
    title: "Classes | GSDTA Tamil School",
    description: "Grades, curriculum, and learning paths.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Classes | GSDTA Tamil School",
    description: "Grades, curriculum, and learning paths.",
    images: ["/images/logo.png"],
  },
  robots: { index: false, follow: false },
};

export default function ClassesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
