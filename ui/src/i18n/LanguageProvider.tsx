"use client";
import {createContext, useContext, useEffect, useMemo, useState, useCallback} from "react";
import type {Lang} from "./messages";
import {messages} from "./messages";

type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
    lang: Lang;
    setLang: (l: Lang) => void;
    t: (key: string, values?: TranslationValues) => string;
}

const Ctx = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "i18n:lang";

export function LanguageProvider({children, initialLang}: { children: React.ReactNode; initialLang: Lang }) {
    const [lang, setLangState] = useState<Lang>(initialLang);

    useEffect(() => {
        // After mount, check if we should override with client-side preference
        if (typeof window !== "undefined") {
            const stored = (localStorage.getItem(STORAGE_KEY) as Lang | null) || null;
            if (stored === "en" || stored === "ta") {
                if (stored !== initialLang) {
                    setLangState(stored);
                }
            }
        }
    }, [initialLang]);

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

    const formatMessage = useCallback(
        (template: string, values?: TranslationValues) => {
            if (!values) return template;
            return template.replace(/\{(\w+)\}/g, (_, token: string) => {
                if (Object.prototype.hasOwnProperty.call(values, token)) {
                    return String(values[token]);
                }
                return `{${token}}`;
            });
        },
        [],
    );

    const t = useCallback((key: string, values?: TranslationValues) => {
        const pack = messages[lang] || messages.ta;
        const template = pack[key] ?? messages.en[key] ?? key;
        return formatMessage(template, values);
    }, [formatMessage, lang]);

    const value = useMemo(() => ({lang, setLang, t}), [lang, t]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContextValue {
    const ctx = useContext(Ctx);
    if (ctx) return ctx;
    // Fallback (no provider): default to English for tests and consistency
    const formatMessage = (template: string, values?: TranslationValues) => {
        if (!values) return template;
        return template.replace(/\{(\w+)\}/g, (_, token: string) => {
            if (Object.prototype.hasOwnProperty.call(values, token)) {
                return String(values[token]);
            }
            return `{${token}}`;
        });
    };
    const t = (key: string, values?: TranslationValues) => {
        const template = messages.en[key] ?? key;
        return formatMessage(template, values);
    };
    return {
        lang: "en", setLang: () => {
        }, t
    };
}
