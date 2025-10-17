"use client";
import { useI18n } from "@/i18n/LanguageProvider";

export default function DonatePage() {
  const { t } = useI18n();
  return (
    <section>
      <h1 data-testid="page-title" className="text-2xl font-semibold">{t("nav.donate")}</h1>
      <p className="mt-2 text-gray-700">{t("common.comingSoon")}</p>
    </section>
  );
}
