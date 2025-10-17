import type {Metadata} from "next";
import "./globals.css";
import "@react-pdf-viewer/core/lib/styles/index.css";
import {Header} from "@/components/Header";
import {MockProvider} from "@/components/MockProvider";
import {DevStatus} from "@/components/DevStatus";
import {AuthProvider} from "@/components/AuthProvider";
import {Footer} from "@/components/Footer";
import {LanguageProvider} from "@/i18n/LanguageProvider";
import { Noto_Sans_Tamil } from "next/font/google";
import { cookies, headers } from "next/headers";
import { FORCED_THEME } from "@/config/theme";

const notoTamil = Noto_Sans_Tamil({
    weight: ["400", "500", "700"],
    subsets: ["tamil"],
    display: "swap",
    variable: "--font-noto-tamil",
});

export const metadata: Metadata = {
    title: "GSDTA தமிழ் பள்ளி",
    description: "குழந்தைகளுக்கான தமிழ்ப் பயிற்சி — எழுத்து, வாசிப்பு, பேச்சு, எழுத்துத்தல்",
};

export const viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    ],
};

async function detectInitialLang(): Promise<"en" | "ta"> {
    const jar = await cookies();
    const cookieLang = jar.get("i18n:lang")?.value;
    if (cookieLang === "ta" || cookieLang === "en") return cookieLang;
    const hdrs = await headers();
    const accept = hdrs.get("accept-language")?.toLowerCase() ?? "";
    if (accept.startsWith("ta")) return "ta";
    return "en";
}

export default async function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    const initialLang = await detectInitialLang();
    // Force theme based on config/environment: add class="dark" to enable dark variants when forced dark
    const forced = FORCED_THEME; // "light" | "dark" | null
    const htmlClass = forced === "dark" ? "dark" : undefined;
    const htmlDataTheme = forced ?? undefined;

    return (
        <html lang={initialLang} className={htmlClass} data-theme={htmlDataTheme}>
        <head>
            {/* Allow both light and dark native UI/scrollbars across browsers */}
            <meta name="color-scheme" content="light dark" />
        </head>
        <body className={["antialiased", notoTamil.variable].join(" ") }>
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
