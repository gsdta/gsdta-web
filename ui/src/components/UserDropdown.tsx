"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/i18n/LanguageProvider";

export function UserDropdown() {
    const { user } = useAuth();
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close dropdown on escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    if (!user) return null;

    // Defensive: handle stale sessionStorage data that may lack roles
    const roles = user.roles ?? [];
    const hasMultipleRoles = roles.length > 1;

    const closeDropdown = () => setOpen(false);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded px-2 py-1"
                aria-expanded={open}
                aria-haspopup="true"
            >
                <span>{user.name}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-[100]"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={closeDropdown}
                    >
                        {t("nav.profile")}
                    </Link>

                    {hasMultipleRoles && (
                        <Link
                            href="/select-role"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                            onClick={closeDropdown}
                        >
                            {t("nav.switchRole")}
                        </Link>
                    )}

                    <Link
                        href="/logout"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                        onClick={closeDropdown}
                    >
                        {t("nav.logout")}
                    </Link>
                </div>
            )}
        </div>
    );
}

// Mobile version - displays as a list instead of dropdown
export function UserDropdownMobile({ onItemClick }: { onItemClick?: () => void }) {
    const { user } = useAuth();
    const { t } = useI18n();

    if (!user) return null;

    // Defensive: handle stale sessionStorage data that may lack roles
    const roles = user.roles ?? [];
    const hasMultipleRoles = roles.length > 1;

    const handleClick = () => {
        onItemClick?.();
    };

    return (
        <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="text-gray-600 text-sm mb-2">{user.name}</div>
            <div className="flex flex-col gap-2">
                <Link
                    href="/profile"
                    className="text-gray-900 hover:underline"
                    onClick={handleClick}
                >
                    {t("nav.profile")}
                </Link>

                {hasMultipleRoles && (
                    <Link
                        href="/select-role"
                        className="text-gray-900 hover:underline"
                        onClick={handleClick}
                    >
                        {t("nav.switchRole")}
                    </Link>
                )}

                <Link
                    href="/logout"
                    className="text-gray-900 hover:underline"
                    onClick={handleClick}
                >
                    {t("nav.logout")}
                </Link>
            </div>
        </div>
    );
}
