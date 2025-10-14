import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { MockProvider } from "@/components/MockProvider";
import { DevStatus } from "@/components/DevStatus";
import { AuthProvider } from "@/components/AuthProvider";

// Temporarily disabled Google Fonts due to network issues
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "GSDTA School App",
  description: "Administration and classroom tools for GSDTA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <MockProvider>
          <AuthProvider>
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-6">
              {children}
              <DevStatus />
            </main>
          </AuthProvider>
        </MockProvider>
      </body>
    </html>
  );
}
