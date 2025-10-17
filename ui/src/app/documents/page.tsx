"use client";

import { useState, useEffect, useMemo } from "react";
import { PdfViewer } from "@/components/PdfViewer";
import { useI18n } from "@/i18n/LanguageProvider";

const SECTIONS = [
  {
    key: "bylaws" as const,
    labelKey: "documents.bylaws",
    pdf: "/docs/bylaws.pdf",
    available: true,
  },
  {
    key: "tax" as const,
    labelKey: "documents.taxExempt",
    pdf: "/docs/determination-letter.pdf",
    available: true,
  },
  {
    key: "financials" as const,
    labelKey: "documents.financials",
    pdf: undefined,
    available: false,
  },
];

type SectionKey = (typeof SECTIONS)[number]["key"];

function readTabFromUrl<T extends string>(allowed: readonly T[]): T | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const hash = url.hash?.slice(1).toLowerCase();
    const qp =
      (url.searchParams.get("tab") || url.searchParams.get("section") || "")
        .toLowerCase();
    const candidate = (hash || qp) as T | "";
    if (candidate && (allowed as readonly string[]).includes(candidate))
      return candidate as T;
  } catch {}
  return null;
}

export default function DocumentsPage() {
  const { t } = useI18n();
  const keys = useMemo(() => SECTIONS.map((s) => s.key) as readonly SectionKey[], []);
  const [active, setActive] = useState<SectionKey>(
    () => readTabFromUrl(keys) || SECTIONS[0].key
  );
  const current = SECTIONS.find((s) => s.key === active)!;

  // Initialize from URL and listen to URL changes
  useEffect(() => {
    const applyFromUrl = () => {
      const from = readTabFromUrl(keys);
      if (from) setActive(from);
    };
    applyFromUrl();
    window.addEventListener("hashchange", applyFromUrl);
    window.addEventListener("popstate", applyFromUrl);
    return () => {
      window.removeEventListener("hashchange", applyFromUrl);
      window.removeEventListener("popstate", applyFromUrl);
    };
  }, [keys]);

  const onTabClick = (k: SectionKey) => {
    setActive(k);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", k);
      url.hash = `#${k}`;
      window.history.replaceState(null, "", url.toString());
    }
  };

  const getLabel = (key: SectionKey) => {
    const sec = SECTIONS.find((s) => s.key === key)!;
    return t(sec.labelKey);
  };

  const currentLabel = getLabel(current.key);

  return (
    <section className="flex flex-col gap-6">
      <h1 data-testid="page-title" className="text-2xl font-semibold">
        {t("documents.title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left navigation */}
        <nav aria-label={t("documents.title")} className="lg:col-span-3">
          <ul className="flex lg:flex-col gap-2">
            {SECTIONS.map((s) => {
              const isActive = s.key === active;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => onTabClick(s.key)}
                    className={[
                      "w-full text-left rounded-md px-3 py-2 border",
                      isActive
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-white hover:bg-gray-50 border-gray-300",
                      !s.available ? "opacity-60" : "",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {t(s.labelKey)}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content area */}
        <div className="lg:col-span-9">
          {/* Hidden anchors for hash navigation and static analysis */}
          <div aria-hidden="true" className="sr-only">
            {SECTIONS.map((s) => (
              <div key={`anchor-${s.key}`} id={s.key} />
            ))}
          </div>

          <h2 className="sr-only">{currentLabel}</h2>
          {current.available && current.pdf ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <a
                  href={current.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 underline hover:no-underline"
                >
                  {t("common.openInNewTab")}
                </a>
                <a
                  href={current.pdf}
                  download
                  className="text-green-700 underline hover:no-underline"
                >
                  {t("common.downloadPdf")}
                </a>
              </div>

              {/* Single-pane PDF renderer using pdf.js via @react-pdf-viewer/core */}
              <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                <PdfViewer fileUrl={current.pdf} height="75vh" />
              </div>
              <p className="text-sm text-gray-600">
                {/* Keep English fallback sentence to match current UX */}
                If the PDF doesn’t display, use the links above to open or download
                it.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p>
                {currentLabel} are not available yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
