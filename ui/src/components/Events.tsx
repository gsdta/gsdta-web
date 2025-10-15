"use client";
import {useI18n} from "@/i18n/LanguageProvider";

export function Events() {
    const {t} = useI18n();
    const events = [
        {
            title: "ஆண்டு திறன் வெளிப்பாடு",
            date: "மே 24, 2025",
            blurb: "மாணவர்களின் குளுவாக்கவும்தனிப்பட்டதாக்கவும் கற்றதை வெளிப்படுத்தும் சிறப்பு மேடை.",
        },
        {
            title: "சமூக நிகழ்ச்சி",
            date: "ஆகஸ்ட் 10, 2025",
            blurb: "இடைநிலை மற்றும் மேம்பட்ட மாணவர்களின் வெளிநிகழ்ச்சி பங்கேற்பு.",
        },
    ];
    return (
        <section aria-labelledby="events-heading" className="mx-auto max-w-6xl">
            <div className="flex items-baseline justify-between gap-4">
                <h2 id="events-heading" className="text-xl font-semibold text-gray-900">{t("sections.events")}</h2>
                <a href="#" className="text-sm text-rose-700 hover:underline">{t("sections.events.viewAll")}</a>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {events.map((e) => (
                    <article key={e.title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <h3 className="text-base font-semibold text-gray-900">{e.title}</h3>
                        <div className="mt-1 text-xs text-gray-500">{e.date}</div>
                        <p className="mt-2 text-sm text-gray-700">{e.blurb}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
