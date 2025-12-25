"use client";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UserDropdown, UserDropdownMobile } from "@/components/UserDropdown";
import { useState } from "react";

// Static navigation links shown to all users
const staticNav = [
    { href: "/", labelKey: "nav.home" },
    { href: "/about/", labelKey: "nav.about" },
    { href: "/team/", labelKey: "nav.team" },
    { href: "/documents/", labelKey: "nav.documents" },
    { href: "/calendar/", labelKey: "nav.calendar" },
    { href: "/textbooks/", labelKey: "nav.textbooks" },
    { href: "/donate/", labelKey: "nav.donate" },
];

export function Header() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const authMode = process.env.NEXT_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "mock" as const;

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

                {/* Desktop nav - same links for all users */}
                <nav className="hidden sm:flex items-center gap-4 text-sm">
                    {staticNav.map((item) => (
                        <Link key={item.href} href={item.href} className="hover:underline text-gray-900">
                            {t(item.labelKey)}
                        </Link>
                    ))}
                    {/* Contact intentionally removed from header */}
                    <LanguageSwitcher />
                    {user ? (
                        <UserDropdown />
                    ) : (
                        /* Show Sign in link in Firebase mode only */
                        authMode === "firebase" && (
                            <Link href="/signin" className="hover:underline text-gray-900">{t("nav.login")}</Link>
                        )
                    )}
                </nav>

                {/* Mobile controls: show language + hamburger */}
                <div className="sm:hidden inline-flex items-center gap-2">
                    <LanguageSwitcher />
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
                        {staticNav.map((item) => (
                            <Link key={item.href} href={item.href} className="hover:underline text-gray-900" onClick={close}>
                                {t(item.labelKey)}
                            </Link>
                        ))}
                        {user ? (
                            <UserDropdownMobile onItemClick={close} />
                        ) : (
                            /* Show Sign in link in Firebase mode only */
                            authMode === "firebase" && (
                                <Link href="/signin" className="hover:underline text-gray-900" onClick={close}>{t("nav.login")}</Link>
                            )
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
}
