"use client";

import { useState } from "react";
import { PdfViewer } from "@/components/PdfViewer";

const SECTIONS = [
  {
    key: "bylaws" as const,
    label: "By Laws",
    pdf: "/docs/bylaws.pdf",
    available: true,
  },
  {
    key: "tax" as const,
    label: "501(c)(3) Tax Exempt",
    pdf: "/docs/determination-letter.pdf",
    available: true,
  },
  {
    key: "financials" as const,
    label: "Financial Reports",
    pdf: undefined,
    available: false,
  },
];

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function DocumentsPage() {
  const [active, setActive] = useState<SectionKey>(SECTIONS[0].key);
  const current = SECTIONS.find((s) => s.key === active)!;

  return (
    <section className="flex flex-col gap-6">
      <h1 data-testid="page-title" className="text-2xl font-semibold">
        Documents
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left navigation */}
        <nav aria-label="Documents" className="lg:col-span-3">
          <ul className="flex lg:flex-col gap-2">
            {SECTIONS.map((s) => {
              const isActive = s.key === active;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => setActive(s.key)}
                    className={[
                      "w-full text-left rounded-md px-3 py-2 border",
                      isActive
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-white hover:bg-gray-50 border-gray-300",
                      !s.available ? "opacity-60" : "",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {s.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content area */}
        <div className="lg:col-span-9">
          <h2 className="sr-only">{current.label}</h2>
          {current.available && current.pdf ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <a
                  href={current.pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 underline hover:no-underline"
                >
                  Open in new tab
                </a>
                <a
                  href={current.pdf}
                  download
                  className="text-green-700 underline hover:no-underline"
                >
                  Download PDF
                </a>
              </div>

              {/* Single-pane PDF renderer using pdf.js via @react-pdf-viewer/core */}
              <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                <PdfViewer fileUrl={current.pdf} height="75vh" />
              </div>
              <p className="text-sm text-gray-600">
                If the PDF doesn’t display, use the links above to open or download
                it.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p>
                {current.label} are not available yet. We’ll publish them here
                soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
