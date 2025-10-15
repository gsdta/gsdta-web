import type {Metadata} from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {Header} from "@/components/Header";
import {MockProvider} from "@/components/MockProvider";
import {DevStatus} from "@/components/DevStatus";
import {AuthProvider} from "@/components/AuthProvider";
import {Footer} from "@/components/Footer";
import {LanguageProvider} from "@/i18n/LanguageProvider";

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
    title: "GSDTA தமிழ் பள்ளி",
    description: "குழந்தைகளுக்கான தமிழ்ப் பயிற்சி — எழுத்து, வாசிப்பு, பேச்சு, எழுத்துத்தல்",
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
            <LanguageProvider>
                <AuthProvider>
                    <Header/>
                    <main className="mx-auto max-w-6xl px-4 py-6">
                        {children}
                        <DevStatus/>
                    </main>
                    <Footer/>
                </AuthProvider>
            </LanguageProvider>
        </MockProvider>
        </body>
        </html>
    );
}
