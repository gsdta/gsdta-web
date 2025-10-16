"use client";
import Link from "next/link";
import {useAuth} from "@/components/AuthProvider";
import type {Role} from "@/lib/auth-types";
import {useI18n} from "@/i18n/LanguageProvider";
import {LanguageSwitcher} from "@/components/LanguageSwitcher";

const roleNav: Record<Role, { href: string; labelKey: string }[]> = {
    admin: [
        {href: "/dashboard", labelKey: "nav.dashboard"},
        {href: "/students", labelKey: "nav.students"},
        {href: "/classes", labelKey: "nav.classes"},
        {href: "/enrollment/review", labelKey: "nav.enrollment"},
    ],
    teacher: [
        {href: "/dashboard", labelKey: "nav.dashboard"},
        {href: "/classes", labelKey: "nav.classes"},
    ],
    parent: [
        {href: "/dashboard", labelKey: "nav.dashboard"},
        {href: "/students", labelKey: "nav.students"},
        {href: "/enrollment", labelKey: "nav.enrollment"},
        {href: "/classes", labelKey: "nav.classes"},
    ],
};

export function Header() {
    const {user, setRole} = useAuth();
    const {t} = useI18n();

    const onRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        await setRole(e.target.value as Role);
    };

    return (
        <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50 sticky top-0 z-10">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
                <Link href="/" className="font-semibold">
                    GSDTA
                </Link>
                <nav className="flex items-center gap-4 text-sm">
                    <Link href="/" className="hover:underline">
                        {t("nav.home")}
                    </Link>
                    {user ? (
                        <>
                            {roleNav[user.role].map((item) => (
                                <Link key={item.href} href={item.href} className="hover:underline">
                                    {t(item.labelKey)}
                                </Link>
                            ))}
                            <LanguageSwitcher/>
                            <span aria-live="polite" className="text-gray-600">
                {user.name} ({user.role})
              </span>
                            <label className="sr-only" htmlFor="role-select">
                                {t("nav.role")}
                            </label>
                            <select
                                id="role-select"
                                value={user.role}
                                onChange={onRoleChange}
                                className="border rounded px-2 py-1 text-xs"
                                aria-label={t("nav.role")}
                            >
                                <option value="parent">பெற்றோர்</option>
                                <option value="teacher">ஆசிரியர்</option>
                                <option value="admin">நிர்வாகி</option>
                            </select>
                            <Link href="/logout" className="hover:underline">
                                {t("nav.logout")}
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/about/" className="hover:underline">{t("nav.about")}</Link>
                            <Link href="/register/" className="hover:underline">{t("nav.register")}</Link>
                            <Link href="/team/" className="hover:underline">{t("nav.team")}</Link>
                            <Link href="/documents/" className="hover:underline">{t("nav.documents")}</Link>
                            <Link href="/calendar/" className="hover:underline">{t("nav.calendar")}</Link>
                            <Link href="/textbooks/" className="hover:underline">{t("nav.textbooks")}</Link>
                            <Link href="/donate/" className="hover:underline">{t("nav.donate")}</Link>
                            <Link href="/contact/" className="hover:underline">{t("nav.contact")}</Link>
                            <LanguageSwitcher/>
                            <Link href="/login" className="hover:underline">
                                {t("nav.login")}
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
