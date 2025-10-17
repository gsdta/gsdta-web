"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import people from "@/data/people.json";
import { useI18n } from "@/i18n/LanguageProvider";

// Section config similar to Documents
const SECTIONS = [
  { key: "board" as const, labelKey: "team.board" },
  { key: "executives" as const, labelKey: "team.executives" },
  { key: "teachers" as const, labelKey: "team.teachers" },
  { key: "volunteers" as const, labelKey: "team.volunteers", available: false },
  { key: "faq" as const, labelKey: "team.faq", available: false },
];

// Public site URL for absolute links in JSON-LD
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

type SectionKey = (typeof SECTIONS)[number]["key"];

// Known photos in /public/images mapped by id
const IMAGE_MAP: Record<string, string> = {
  // Board
  "bala-jayaseelan": "/images/Bala Jayaseelan.jpeg",
  "karthikeyan-nk": "/images/karthik_ts.jpg",
  "devi-kumaradev": "/images/devi_kumaradev_ts.jpeg",
  "rajaraman-krishnan": "/images/rajaraman_ts.jpg",
  // Executives / committees
  "ashok-annamalai": "/images/ashok_annamalai_ts.jpeg",
  "nachiappan-panchanathan": "/images/Nachiappan.jpeg",
  // Assistants/others
  "sujatha-karthikeyan": "/images/SujathaK.jpeg",
  // Fix: actual file name uses underscore, not hyphen
  "gunasekaran-pasupathy": "/images/gunasekaran_pasupathy.png",
};

const PLACEHOLDER_MALE = "/images/male_dummy.png";
const PLACEHOLDER_FEMALE = "/images/female_dummy.png";

function getPhotoSrc(id: string, gender?: string): string {
  if (IMAGE_MAP[id]) {
    return IMAGE_MAP[id];
  }
  // Use gender-specific placeholder
  return gender === "female" ? PLACEHOLDER_FEMALE : PLACEHOLDER_MALE;
}

function PersonTile({
  id,
  name,
  subtitle,
  highlight,
  bio,
  gender,
  onExpand,
}: {
  id: string;
  name: string;
  subtitle?: string;
  highlight?: string;
  bio?: string;
  gender?: string;
  onExpand?: () => void;
}) {
  const { t } = useI18n();
  const src = getPhotoSrc(id, gender);
  const bioPreview = bio ? bio.substring(0, 100) + "..." : null;

  return (
    <article className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-start gap-4 p-4">
        <Image
          src={src}
          alt={name}
          width={64}
          height={64}
          className="h-16 w-16 flex-shrink-0 rounded-full object-cover border border-gray-200 bg-gray-100"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{name}</h3>
          {highlight ? (
            <p className="text-sm text-green-700 font-medium">{highlight}</p>
          ) : null}
          {subtitle ? (
            <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
          ) : null}
          {bioPreview && onExpand ? (
            <div className="mt-2">
              <p className="text-sm text-gray-700">{bioPreview}</p>
              <button
                type="button"
                onClick={onExpand}
                className="mt-1 text-sm text-green-700 font-medium hover:underline"
              >
                {t("team.more")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function PersonDetailView({
  id,
  name,
  role,
  location,
  bio,
  gender,
  onClose,
}: {
  id: string;
  name: string;
  role?: string;
  location?: string;
  bio: string;
  gender?: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const src = getPhotoSrc(id, gender);

  // JSON-LD for Person rich results
  const absoluteImage = `${SITE_URL}${src}`;
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: role,
    description: bio?.slice(0, 300),
    gender,
    image: absoluteImage,
    affiliation: {
      "@type": "Organization",
      name: "GSDTA Tamil School",
      url: SITE_URL,
    },
    homeLocation: location,
    url: `${SITE_URL}/team/`,
  };

  return (
    <article className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="p-6">
        <div className="flex items-start gap-6 mb-4">
          <Image
            src={src}
            alt={name}
            width={128}
            height={128}
            className="h-32 w-32 flex-shrink-0 rounded-full object-cover border border-gray-200 bg-gray-100"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
            {role ? (
              <p className="text-base text-green-700 font-medium mt-1">{role}</p>
            ) : null}
            {location ? (
              <p className="text-sm text-gray-600 mt-1">{location}</p>
            ) : null}
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{bio}</p>
        </div>

        {/* Structured data for the person */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
        />

        <button
          type="button"
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors"
        >
          {t("team.close")}
        </button>
      </div>
    </article>
  );
}

function CommitteeTile({
  id,
  name,
  members,
}: {
  id: string;
  name: string;
  members: { id: string; name: string; gender?: string }[];
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">{name}</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {members.map((m) => (
          <li key={`${id}-${m.id}`} className="flex items-center gap-3">
            <Image
              src={getPhotoSrc(m.id, m.gender)}
              alt={m.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover border border-gray-200 bg-gray-100"
              loading="lazy"
            />
            <span className="text-sm text-gray-800">{m.name}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function readTabFromUrl<T extends string>(allowed: readonly T[]): T | null {
  if (typeof window === "undefined") return null;
  // In test environment, avoid reading from URL to prevent cross-test bleed
  if (process.env.NODE_ENV === "test") return null;
  try {
    const url = new URL(window.location.href);
    const hash = url.hash?.slice(1).toLowerCase();
    const qp = (url.searchParams.get("tab") || url.searchParams.get("section") || "").toLowerCase();
    const candidate = (hash || qp) as T | "";
    if (candidate && (allowed as readonly string[]).includes(candidate)) return candidate as T;
  } catch {}
  return null;
}

export default function TeamPage() {
  const { t } = useI18n();
  const keys = useMemo(() => SECTIONS.map((s) => s.key) as readonly SectionKey[], []);
  const [active, setActive] = useState<SectionKey>(() => readTabFromUrl(keys) || SECTIONS[0].key);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);

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
      // Don't mutate URL during unit tests to avoid affecting other tests
      if (process.env.NODE_ENV !== "test") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", k);
        url.hash = `#${k}`;
        window.history.replaceState(null, "", url.toString());
      }
    }
  };

  const expandedPerson = useMemo(() => {
    if (!expandedPersonId) return null;
    return people.board.find((p) => p.id === expandedPersonId);
  }, [expandedPersonId]);

  const labelFor = (k: SectionKey) => t(SECTIONS.find((s) => s.key === k)!.labelKey);

  return (
    <section className="flex flex-col gap-6">
      <h1 data-testid="page-title" className="text-2xl font-semibold">
        {t("team.title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left navigation */}
        <nav aria-label={t("team.title")} className="lg:col-span-3">
          <ul className="flex flex-wrap lg:flex-col gap-2">
            {SECTIONS.map((s) => {
              const isActive = s.key === active;
              const available = s.available !== false;
              return (
                <li key={s.key} className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onTabClick(s.key)}
                    className={[
                      "w-full text-left rounded-md px-3 py-2 border whitespace-nowrap",
                      isActive
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-white hover:bg-gray-50 border-gray-300",
                      !available ? "opacity-60" : "",
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

          <h2 className="sr-only">{labelFor(active)}</h2>

          {active === "board" && (
            <>
              {expandedPerson ? (
                <PersonDetailView
                  id={expandedPerson.id}
                  name={expandedPerson.name}
                  role={expandedPerson.role}
                  location={expandedPerson.location}
                  bio={expandedPerson.bio}
                  gender={expandedPerson.gender}
                  onClose={() => setExpandedPersonId(null)}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {people.board.map((p) => (
                    <PersonTile
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      highlight={p.role}
                      subtitle={p.location ?? undefined}
                      bio={p.bio}
                      gender={p.gender}
                      onExpand={() => setExpandedPersonId(p.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {active === "executives" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {people.committees.map((c) => (
                <CommitteeTile key={c.id} id={c.id} name={c.name} members={c.members} />
              ))}
            </div>
          )}

          {active === "teachers" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t("team.ourTeachers")}</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {people.teachers.map((tch) => (
                    <PersonTile
                      key={tch.id}
                      id={tch.id}
                      name={tch.name}
                      subtitle={tch.grade}
                      gender={tch.gender}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t("team.assistantTeachers")}</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {people.assistantTeachers.map((tch) => (
                    <PersonTile
                      key={tch.id}
                      id={tch.id}
                      name={tch.name}
                      subtitle={tch.grade}
                      gender={tch.gender}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {(active === "volunteers" || active === "faq") && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p>{t(SECTIONS.find(s => s.key === active)!.labelKey)} are not available yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
