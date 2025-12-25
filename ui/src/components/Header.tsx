"use client";
import Link from "next/link";
import {useAuth} from "@/components/AuthProvider";
import type {Role} from "@/lib/auth-types";
import {useI18n} from "@/i18n/LanguageProvider";
import {LanguageSwitcher} from "@/components/LanguageSwitcher";
import {useState} from "react";

const roleNav: Record<Role, { href: string; labelKey: string }[]> = {
    admin: [
        {href: "/", labelKey: "nav.home"},
        {href: "/dashboard", labelKey: "nav.dashboard"},
    ],
    teacher: [
        {href: "/", labelKey: "nav.home"},
        {href: "/dashboard", labelKey: "nav.dashboard"},
        {href: "/classes", labelKey: "nav.classes"},
    ],
    parent: [
        {href: "/", labelKey: "nav.home"},
        {href: "/dashboard", labelKey: "nav.dashboard"},
    ],
};

export function Header() {
    const {user, setRole} = useAuth();
    const {t} = useI18n();
    const [open, setOpen] = useState(false);
    const authMode = process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "mock" as const;

    const onRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        await setRole(e.target.value as Role);
    };

    const toggle = () => setOpen((v) => !v);
    const close = () => setOpen(false);

    return (
        <header className="border-b border-gray-200 bg-white/70 supports-[backdrop-filter]:bg-white/50 backdrop-blur sticky top-0 z-10">
            <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between gap-4">
                <Link href="/" className="text-gray-900 max-w-[60vw] lg:max-w-none truncate" onClick={close} title={t("brand.full")} aria-label={t("brand.full")} suppressHydrationWarning>
                    {/* Brand title + compact tagline (tagline hidden on small screens to avoid extra height) */}
                    <span className="block whitespace-nowrap leading-tight" suppressHydrationWarning>
                        <span className="font-semibold" suppressHydrationWarning>{t("brand.short")}</span>
                    </span>
                    <span className="hidden md:block text-[10px] leading-tight text-gray-600 -mt-0.5">
                        {t("brand.tagline")}
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden sm:flex items-center gap-4 text-sm">
                    {user ? (
                        <>
                            {roleNav[user.role].map((item) => (
                                <Link key={item.href} href={item.href} className="hover:underline text-gray-900">
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
                                className="border rounded px-2 py-1 text-xs border-gray-300 bg-white text-gray-900"
                                aria-label={t("nav.role")}
                            >
                                <option value="parent">பெற்றோர்</option>
                                <option value="teacher">ஆசிரியர்</option>
                                <option value="admin">நிர்வாகி</option>
                            </select>
                            {authMode === "firebase" && user.authProvider === "password" && (
                                <Link href="/account/change-password" className="hover:underline text-gray-900">
                                    {t("nav.changePassword")}
                                </Link>
                            )}
                            <Link href="/logout" className="hover:underline text-gray-900">
                                {t("nav.logout")}
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/" className="hover:underline text-gray-900">{t("nav.home")}</Link>
                            <Link href="/about/" className="hover:underline text-gray-900">{t("nav.about")}</Link>
                            <Link href="/team/" className="hover:underline text-gray-900">{t("nav.team")}</Link>
                            <Link href="/documents/" className="hover:underline text-gray-900">{t("nav.documents")}</Link>
                            <Link href="/calendar/" className="hover:underline text-gray-900">{t("nav.calendar")}</Link>
                            <Link href="/textbooks/" className="hover:underline text-gray-900">{t("nav.textbooks")}</Link>
                            <Link href="/donate/" className="hover:underline text-gray-900">{t("nav.donate")}</Link>
                            {/* Contact intentionally removed from header */}
                            <LanguageSwitcher/>
                            {/* Show Sign in link in Firebase mode only */}
                            {authMode === "firebase" && (
                                <Link href="/signin" className="hover:underline text-gray-900">{t("nav.login")}</Link>
                            )}
                        </>
                    )}
                </nav>

                {/* Mobile controls: show language + hamburger */}
                <div className="sm:hidden inline-flex items-center gap-2">
                    <LanguageSwitcher/>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm shadow-sm ring-1 bg-white border-gray-300 ring-black/10/10 hover:bg-white:bg-gray-800"
                        aria-label={open ? "Close menu" : "Open menu"}
                        aria-controls="mobile-menu"
                        aria-expanded={open}
                        onClick={toggle}
                    >
                        {open ? (
                            <span aria-hidden>✕</span>
                        ) : (
                            <span aria-hidden>☰</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile panel */}
            {open && (
                <nav
                    id="mobile-menu"
                    aria-label="Mobile menu"
                    className="sm:hidden border-t border-gray-200 bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur"
                >
                    <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 text-sm">
                        {user ? (
                            <>
                                {roleNav[user.role].map((item) => (
                                    <Link key={item.href} href={item.href} className="hover:underline text-gray-900" onClick={close}>
                                        {t(item.labelKey)}
                                    </Link>
                                ))}
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">{user.name} ({user.role})</span>
                                </div>
                                <label className="sr-only" htmlFor="role-select-mobile">
                                    {t("nav.role")}
                                </label>
                                <select
                                    id="role-select-mobile"
                                    value={user.role}
                                    onChange={onRoleChange}
                                    className="border rounded px-2 py-1 text-xs w-fit border-gray-300 bg-white text-gray-900"
                                    aria-label={t("nav.role")}
                                >
                                    <option value="parent">பெற்றோர்</option>
                                    <option value="teacher">ஆசிரியர்</option>
                                    <option value="admin">நிர்வாகி</option>
                                </select>
                                {authMode === "firebase" && user.authProvider === "password" && (
                                    <Link href="/account/change-password" className="hover:underline text-gray-900" onClick={close}>
                                        {t("nav.changePassword")}
                                    </Link>
                                )}
                                <Link href="/logout" className="hover:underline text-gray-900" onClick={close}>
                                    {t("nav.logout")}
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/" className="hover:underline text-gray-900" onClick={close}>{t("nav.home")}</Link>
                                <Link href="/about/" className="hover:underline text-gray-900" onClick={close}>{t("nav.about")}</Link>
                                <Link href="/team/" className="hover:underline text-gray-900" onClick={close}>{t("nav.team")}</Link>
                                <Link href="/documents/" className="hover:underline text-gray-900" onClick={close}>{t("nav.documents")}</Link>
                                <Link href="/calendar/" className="hover:underline text-gray-900" onClick={close}>{t("nav.calendar")}</Link>
                                <Link href="/donate/" className="hover:underline text-gray-900" onClick={close}>{t("nav.donate")}</Link>
                                {/* Show Sign in link in Firebase mode only */}
                                {authMode === "firebase" && (
                                    <Link href="/signin" className="hover:underline text-gray-900" onClick={close}>{t("nav.login")}</Link>
                                )}
                            </>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
}
