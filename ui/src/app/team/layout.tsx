import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Meet the GSDTA Tamil School team — Board members, committees, teachers, and assistants serving the San Diego Tamil community.",
  alternates: { canonical: "/team/" },
  openGraph: {
    type: "website",
    url: "/team/",
    title: "Team | GSDTA Tamil School",
    description:
      "Meet the GSDTA Tamil School team — Board members, committees, teachers, and assistants.",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "GSDTA Logo" }],
  },
  twitter: {
    card: "summary",
    title: "Team | GSDTA Tamil School",
    description:
      "Meet the GSDTA Tamil School team — Board members, committees, teachers, and assistants.",
    images: ["/images/logo.png"],
  },
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}

