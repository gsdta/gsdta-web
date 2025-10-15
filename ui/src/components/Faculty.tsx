"use client";
import {useI18n} from "@/i18n/LanguageProvider";

export function Faculty() {
    const {t} = useI18n();
    const people = [
        {
            name: "கலை இயக்குநர்",
            bio: "நாட்கணக்கான கற்பித்தல் அனுபவம்; உச்சரிப்பு, வாசிப்புணர்வு, எழுத்து பயிற்சி ஆகிவற்றில் நுட்பம்.",
            initials: "கஇ",
        },
        {
            name: "மூத்த ஆசிரியர்",
            bio: "இடை/மேம்பட்டு நிலை மாணவர்களுக்கு தனிப்பட்ட வழிகாட்டல்; இலக்கணம் முற்றும் நடைமுறைப் பயணம்.",
            initials: "மஆ",
        },
        {
            name: "ஆசிரியர்",
            bio: "தொடக்கநிலையில அனுபும பொறுமையும கொண்ட அணுகுமுறை; சொல்வளமம் முன்னேற்றம்.",
            initials: "ஆசி",
        },
    ];
    return (
        <section aria-labelledby="faculty-heading" className="mx-auto max-w-6xl">
            <h2 id="faculty-heading" className="text-xl font-semibold text-gray-900">
                {t("sections.faculty")}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((p) => (
                    <article
                        key={p.name}
                        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700 font-semibold">
                                {p.initials}
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    {p.name}
                                </h3>
                                <p className="mt-1 text-sm text-gray-700">{p.bio}</p>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
