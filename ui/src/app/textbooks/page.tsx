"use client";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/i18n/LanguageProvider";

import {
  TEXTBOOKS,
  buildGoogleDrivePreviewUrl,
  type TextbookGrade,
  type TextbookResource,
  type TextbookResourceKind,
} from "@/data/textbooks";

export default function TextbooksPage() {
  const { t } = useI18n();
  const grades = useMemo(() => TEXTBOOKS, []);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(
    grades[0]?.id ?? null,
  );
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null,
  );

  const selectedGrade: TextbookGrade | undefined = useMemo(
    () => grades.find((grade) => grade.id === selectedGradeId),
    [grades, selectedGradeId],
  );

  const selectedResource: TextbookResource | undefined = useMemo(
    () =>
      selectedGrade?.resources.find(
        (resource) => resource.id === selectedResourceId,
      ),
    [selectedGrade, selectedResourceId],
  );

  useEffect(() => {
    setSelectedResourceId(null);
  }, [selectedGradeId]);

  const getResourceButtonClasses = (
    kind: TextbookResourceKind | undefined,
    isSelected: boolean,
  ) => {
    const baseClasses =
      "w-full rounded-md px-4 py-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring focus-visible:ring-offset-2";

    if (kind === "homework") {
      return `${baseClasses} focus-visible:ring-emerald-500 ${
        isSelected
          ? "bg-emerald-600 text-white shadow dark:bg-emerald-500"
          : "bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      }`;
    }

    if (kind === "mixed") {
      return `${baseClasses} focus-visible:ring-sky-500 ${
        isSelected
          ? "bg-sky-600 text-white shadow dark:bg-sky-500"
          : "bg-sky-100 text-sky-800 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:hover:bg-sky-900/60"
      }`;
    }

    return `${baseClasses} focus-visible:ring-indigo-500 ${
      isSelected
        ? "bg-indigo-600 text-white shadow dark:bg-indigo-500"
        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
    }`;
  };

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 data-testid="page-title" className="text-3xl font-semibold">
          {t("textbooks.pageTitle")}
        </h1>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          {t("textbooks.instructions")}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("textbooks.gradeSelectorLabel")}
        </h2>
        <div
          role="tablist"
          aria-label={t("textbooks.gradeSelectorLabel")}
          className="mt-4 flex flex-wrap gap-2"
        >
          {grades.map((grade) => {
            const isSelected = grade.id === selectedGradeId;
            return (
              <button
                key={grade.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedGradeId(grade.id)}
                className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${isSelected ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-900 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"}`}
                data-testid={`grade-${grade.id}`}
              >
                {grade.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedGrade ? (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="md:w-1/3">
            <div className="h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("textbooks.resourcesTitle", { grade: selectedGrade.label })}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {t("textbooks.resourcesSubtitle")}
              </p>

              <div className="mt-4 flex flex-col gap-2" role="toolbar">
                {selectedGrade.resources.map((resource) => {
                  const isSelected = resource.id === selectedResourceId;
                  return (
                    <button
                      key={resource.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedResourceId(resource.id)}
                      className={getResourceButtonClasses(
                        resource.kind,
                        isSelected,
                      )}
                      data-testid={`resource-${resource.id}`}
                    >
                      {resource.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:flex-1">
            <div className="min-h-[400px] rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {selectedResource ? (
                <iframe
                  title={t("textbooks.viewerTitle", {
                    grade: selectedGrade.label,
                    resource: selectedResource.label,
                  })}
                  src={buildGoogleDrivePreviewUrl(
                    selectedResource.googleDriveId,
                  )}
                  className="h-[480px] w-full rounded-md border border-gray-200 bg-gray-100 dark:border-gray-700"
                  allowFullScreen
                  data-testid="textbook-viewer"
                />
              ) : (
                <div className="flex h-full min-h-[240px] items-center justify-center text-center text-gray-600 dark:text-gray-300">
                  <p>{t("textbooks.selectResourcePrompt")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <p>{t("textbooks.noGradeSelected")}</p>
        </div>
      )}
    </section>
  );
}
