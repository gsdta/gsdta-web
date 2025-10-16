"use client";
import {createContext, useContext, useEffect, useMemo, useState, useCallback} from "react";
import type {Lang} from "./messages";
import {messages} from "./messages";

interface I18nContextValue {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: string) => string;
}

const Ctx = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "i18n:lang";

export function LanguageProvider({children}: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>(() => {
        if (typeof window !== "undefined") {
            const stored = (localStorage.getItem(STORAGE_KEY) as Lang | null) || null;
            if (stored === "en" || stored === "ta") return stored;
            // Attempt browser language detection
            const nav = navigator?.language?.toLowerCase() ?? "";
            if (nav.startsWith("ta")) return "ta";
        }
        return "en"; // default English
    });

    const setLang = (l: Lang) => {
        setLangState(l);
        try {
            localStorage.setItem(STORAGE_KEY, l);
            // Also persist as cookie for SSR so <html lang> is correct on first paint
            const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `${STORAGE_KEY}=${l}; path=/; expires=${expires}`;
        } catch {
        }
    };

    useEffect(() => {
        if (typeof document !== "undefined") {
            document.documentElement.lang = lang;
        }
    }, [lang]);

    const t = useCallback((key: string) => {
        const pack = messages[lang] || messages.ta;
        return pack[key] ?? messages.en[key] ?? key;
    }, [lang]);

    const value = useMemo(() => ({lang, setLang, t}), [lang, t]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContextValue {
    const ctx = useContext(Ctx);
    if (ctx) return ctx;
    // Fallback (no provider): Tamil default, no-op setter
    const t = (key: string) => messages.ta[key] ?? messages.en[key] ?? key;
    return {
        lang: "ta", setLang: () => {
        }, t
    };
}
