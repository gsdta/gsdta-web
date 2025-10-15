"use client";
import Link from "next/link";
import {useI18n} from "@/i18n/LanguageProvider";
import {Faculty} from "@/components/Faculty";
import {Events} from "@/components/Events";
import {ThirukkuralDisplay} from "@/components/ThirukkuralDisplay";
import Image from "next/image";

export function HomeContent() {
    const {t} = useI18n();
    return (
        <div className="space-y-16">
            {/* Hero */}
            <section
                className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 ring-1 ring-black/5 px-6 py-12 sm:px-10">
                <div className="mx-auto max-w-4xl">
                    {/* Main Hero Content */}
                    <div className="text-center mb-8">
                        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
                            {t("hero.title")}
                        </h1>
                        <p className="mt-3 text-gray-600 max-w-2xl mx-auto">{t("hero.body")}</p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Link
                                href="/enrollment"
                                className="inline-flex items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            >
                                {t("cta.enroll")}
                            </Link>
                            <Link
                                href="/classes"
                                className="inline-flex items-center justify-center rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                            >
                                {t("cta.viewClasses")}
                            </Link>
                        </div>
                    </div>

                    {/* Thiruvalluvar Section */}
                    <div
                        className="flex flex-col lg:flex-row items-center justify-center gap-8 mt-8 pt-8 border-t border-rose-200/50">
                        {/* Thiruvalluvar Image */}
                        <div className="flex-shrink-0">
                            <div className="relative">
                                <Image
                                    src="/thiruvalluvar.svg"
                                    alt="திருவள்ளுவர்"
                                    width={120}
                                    height={120}
                                    className="drop-shadow-lg"
                                />
                                <div
                                    className="absolute -top-2 -right-2 bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                                    திருவள்ளுவர்
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Thirukkural */}
                        <div className="flex-1 max-w-lg">
                            <ThirukkuralDisplay
                                intervalMs={8000}
                                className="bg-white/60 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-white/40"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* About */}
            <section aria-labelledby="about-heading" className="mx-auto max-w-4xl">
                <h2 id="about-heading" className="text-xl font-semibold text-gray-900">
                    {t("sections.about")}
                </h2>
                <p className="mt-2 text-gray-700 leading-relaxed">
                    மொழி அடிப்படைத்திறன்களில் (உயிர்/மெய் எழுத்துகள், உச்சரிப்பு, சொல்வளம்) நடைமுறையைப் பயன்படுத்துகிறது
                    (வாசிப்புணர்வு, எழுத்துத்தல், உரையாடல்) வரை கட்டுக்கோப்பான பாத்திடிடம்.
                    குழந்தைகள் தன்னம்பிக்கையுடன் தமிழ் பேசுவும் எழுத்தவுமே கற்றுக்கொள்ள அன்பான, ஊக்கமளிக்கும் சூழல்.
                </p>
            </section>

            {/* Programs */}
            <section aria-labelledby="programs-heading" className="mx-auto max-w-6xl">
                <div className="flex items-baseline justify-between gap-4">
                    <h2 id="programs-heading" className="text-xl font-semibold text-gray-900">
                        {t("sections.programs")}
                    </h2>
                    <Link href="/classes" className="text-sm text-rose-700 hover:underline">
                        {t("sections.programs.seeAll")}
                    </Link>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        {
                            title: "தொடக்கநிலை",
                            desc: "எழுத்துகள், ஓதுதல், எளிய சொற்கள் & வாக்கியங்கள், உச்சரிப்பு அடுத்தப்படை.",
                        },
                        {
                            title: "இடைநிலை",
                            desc: "வாசிப்புணர்வு, சொல்வளம் வளர்ப்பு, எளிய கட்டுரை/கதிதம், தினசரி உரையாடல்.",
                        },
                        {
                            title: "மேம்பட்ட நிலை",
                            desc: "இலக்கணக் கருதுக்கள், நீளமான எழுத்துக்கள், சுருக்கம் & விளக்கம்,ுரைபேச்சு.",
                        },
                    ].map((p) => (
                        <div
                            key={p.title}
                            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
                        >
                            <h3 className="text-base font-semibold text-gray-900">{p.title}</h3>
                            <p className="mt-1 text-sm text-gray-700">{p.desc}</p>
                            <div className="mt-3 text-xs text-gray-500">வார இரண்டு வகுப்புகள் · சிறு குழு கவனம்</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Highlights */}
            <section aria-labelledby="why-heading" className="mx-auto max-w-6xl">
                <h2 id="why-heading" className="text-xl font-semibold text-gray-900">{t("sections.why")}</h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    {[
                        {
                            k: "அனுபவமுள்ள ஆசிரியர்கள்",
                            v: "பால்வயதில் குழந்தைகளுக்கான மொழிக் கற்பித்தலில் நீண்ட அனுபவம்"
                        },
                        {k: "கட்டுப்பாடான பாடத்திடம்", v: "தெளிவான நிலைக் கட்டமைப்பு, தொடர்ச்சியான மதிப்பீடு"},
                        {k: "மகிழ்ச்சியான கற்றல்", v: "விளையாட்டுக்கள், கதைகள், செயற்கூறுகள் மூலம் ஆர்வம்"},
                        {k: "சமூகமும்", v: "வீடு–பள்ளி இணைப்பு, பெற்றோர் உடன்பயணம்"},
                    ].map((i) => (
                        <li key={i.k} className="rounded-md border border-gray-200 bg-white p-4">
                            <div className="font-medium text-gray-900">{i.k}</div>
                            <div className="mt-1 text-gray-700">{i.v}</div>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Faculty */}
            <Faculty/>

            {/* Events */}
            <Events/>

            {/* Testimonials */}
            <section aria-labelledby="testimonials-heading" className="mx-auto max-w-4xl">
                <h2 id="testimonials-heading"
                    className="text-xl font-semibold text-gray-900">{t("sections.testimonials")}</h2>
                <div className="mt-3 space-y-3">
                    {[
                        {
                            q: "எளிமையாகவும் ஊக்கமளிப்பதாக்கவும் கற்பிக்கிறார்கள்—என் குழந்தை தமிழ் பேசத் தொடங்கிவிட்டான்!",
                            a: "பெற்றோர், தொடக்கநிலை"
                        },
                        {
                            q: "வாசிப்புணர்வு நிறைவு. வீட்டு பாடமாகும் பயிற்சிகளும் சமநிலையில் உள்ளது.",
                            a: "பெற்றோர், இடைநிலை"
                        },
                    ].map((tst, i) => (
                        <figure key={i} className="rounded-md border border-gray-200 bg-white p-4">
                            <blockquote className="text-gray-800">“{tst.q}”</blockquote>
                            <figcaption className="mt-2 text-sm text-gray-500">— {tst.a}</figcaption>
                        </figure>
                    ))}
                </div>
            </section>

            {/* CTA Banner */}
            <section className="mx-auto max-w-6xl">
                <div className="rounded-lg bg-rose-600 px-6 py-6 text-white shadow">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">{t("cta.ready.title")}</h2>
                            <p className="text-rose-100">{t("cta.ready.body")}</p>
                        </div>
                        <div className="flex gap-3">
                            <Link href="/classes"
                                  className="inline-flex items-center justify-center rounded-md bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">{t("cta.viewClasses")}</Link>
                            <Link href="/enrollment"
                                  className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">{t("cta.enroll")}</Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
