"use client";
import {useI18n} from "@/i18n/LanguageProvider";
import type {Lang} from "@/i18n/messages";

export function LanguageSwitcher() {
    const {lang, setLang, t} = useI18n();
    return (
        <label className="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="sr-only">{t("lang.label")}</span>
            <select
                aria-label={t("lang.label")}
                className="border rounded px-2 py-1 text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                value={lang}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLang(e.target.value as Lang)}
            >
                <option value="ta">{t("lang.ta")}</option>
                <option value="en">{t("lang.en")}</option>
            </select>
        </label>
    );
}
