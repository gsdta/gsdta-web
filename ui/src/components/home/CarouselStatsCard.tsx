"use client";
import { useI18n } from "@/i18n/LanguageProvider";

interface StatItem {
  icon: string;
  value: string;
  label: string;
}

export function CarouselStatsCard() {
  const { t } = useI18n();

  const stats: StatItem[] = [
    {
      icon: "👨‍🎓",
      value: "200+",
      label: t("home.carousel.impact.students"),
    },
    {
      icon: "👩‍🏫",
      value: "45",
      label: t("home.carousel.impact.teachers"),
    },
    {
      icon: "⭐",
      value: "200+",
      label: t("home.carousel.impact.experience"),
    },
    {
      icon: "🤝",
      value: "25+",
      label: t("home.carousel.impact.volunteers"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center p-2 rounded-md bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
        >
          <div className="text-lg mb-0.5">{stat.icon}</div>
          <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
            {stat.value}
          </div>
          <div className="text-[10px] text-center text-gray-600 dark:text-gray-300 leading-tight">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
