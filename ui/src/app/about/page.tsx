"use client";

import { useI18n } from "@/i18n/LanguageProvider";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <section className="flex flex-col gap-8 max-w-4xl">
      <h1 data-testid="page-title" className="text-3xl font-bold text-gray-900">
        {t("about.title")}
      </h1>

      {/* Our Mission */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          {t("about.mission.title")}
        </h2>
        <h3 className="text-xl font-medium text-green-700">
          {t("about.mission.organization")}
        </h3>
        <p className="text-gray-700 leading-relaxed">
          {t("about.mission.description")}
        </p>
      </div>

      {/* Core Values */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">
          {t("about.coreValues.title")}
        </h2>
        <ul className="space-y-4">
          <li className="flex gap-3">
            <span className="text-green-700 font-bold text-lg">•</span>
            <p className="text-gray-700 leading-relaxed flex-1">
              {t("about.coreValues.value1")}
            </p>
          </li>
          <li className="flex gap-3">
            <span className="text-green-700 font-bold text-lg">•</span>
            <p className="text-gray-700 leading-relaxed flex-1">
              {t("about.coreValues.value2")}
            </p>
          </li>
          <li className="flex gap-3">
            <span className="text-green-700 font-bold text-lg">•</span>
            <p className="text-gray-700 leading-relaxed flex-1">
              {t("about.coreValues.value3")}
            </p>
          </li>
          <li className="flex gap-3">
            <span className="text-green-700 font-bold text-lg">•</span>
            <p className="text-gray-700 leading-relaxed flex-1">
              {t("about.coreValues.value4")}
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
