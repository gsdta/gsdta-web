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

// Derive the absolute site URL for metadata and structured data
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
    // Set a base for generating absolute URLs (canonical, OG images, etc.)
    metadataBase: new URL(SITE_URL),
    title: {
        default: "GSDTA தமிழ் பள்ளி",
        template: "%s | GSDTA தமிழ் பள்ளி",
    },
    description: "குழந்தைகளுக்கான தமிழ்ப் பயிற்சி — எழுத்து, வாசிப்பு, பேச்சு, எழுத்துத்தல்",
    keywords: [
        "GSDTA",
        "Tamil School",
        "தமிழ்",
        "Tamil Education",
        "Weekend School",
        "Georgetown",
        "Saraswathi",
        "Language School",
    ],
    // Use the GSDTA logo for browser tab icon(s)
    icons: {
        icon: [
            { url: "/images/logo.png", type: "image/png" },
        ],
        shortcut: "/images/logo.png",
        apple: "/images/logo.png",
    },
    openGraph: {
        type: "website",
        url: "/",
        title: "GSDTA தமிழ் பள்ளி",
        siteName: "GSDTA Tamil School",
        description: "குழந்தைகளுக்கான தமிழ்ப் பயிற்சி — எழுத்து, வாசிப்பு, பேச்சு, எழுத்துத்தல்",
        images: [
            {
                url: "/images/logo.png",
                width: 512,
                height: 512,
                alt: "GSDTA Logo",
            },
        ],
        locale: "en_US",
    },
    twitter: {
        card: "summary",
        title: "GSDTA தமிழ் பள்ளி",
        description: "குழந்தைகளுக்கான தமிழ்ப் பயிற்சி — எழுத்து, வாசிப்பு, பேச்சு, எழுத்துத்தல்",
        images: ["/images/logo.png"],
    },
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
