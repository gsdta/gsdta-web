import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
  description: "GSDTA academic calendar — key dates, events, and holidays.",
  alternates: { canonical: "/calendar/" },
  openGraph: {
    type: "website",
    url: "/calendar/",
    title: "Calendar | GSDTA Tamil School",
    description: "Academic calendar — key dates and events.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Calendar | GSDTA Tamil School",
    description: "Academic calendar — key dates and events.",
    images: ["/images/logo.png"],
  },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}

