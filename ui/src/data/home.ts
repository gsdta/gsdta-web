export interface StatTile {
  id: string;
  title: string;
  subtitle?: string;
}

export const stats: StatTile[] = [
  { id: "students", title: "200 students and growing" },
  { id: "teachers", title: "45 teachers" },
  { id: "experience", title: "200+ years of cumulative experience in running school" },
  { id: "volunteers", title: "25+ non-teaching volunteers" },
];

export interface Slide {
  id: string;
  titleKey: string; // i18n key for title
  descriptionKey?: string; // i18n key for description
  image: string; // public path under /images (kept for compatibility)
  alt: string;
  type?: 'hero' | 'stats' | 'programs' | 'culture' | 'community' | 'success' | 'cta';
  link?: string;
  linkTextKey?: string; // i18n key for link text
}

export const slides: Slide[] = [
  {
    id: "hero",
    type: "hero",
    titleKey: "home.carousel.hero.title",
    descriptionKey: "home.carousel.hero.description",
    image: "/images/gsdts_banner.jpeg",
    alt: "GSDTA Tamil School students and community",
  },
  {
    id: "impact",
    type: "stats",
    titleKey: "home.carousel.impact.title",
    descriptionKey: "home.carousel.impact.description",
    image: "/images/banner_11.png",
    alt: "Community impact statistics",
  },
  {
    id: "enrollment-cta",
    type: "cta",
    titleKey: "home.carousel.cta.title",
    descriptionKey: "home.carousel.cta.description",
    image: "/images/gsdta-registration.jpg",
    alt: "GSDTA registration and enrollment",
    link: "/register/",
    linkTextKey: "home.carousel.cta.button",
  },
  {
    id: "programs",
    type: "programs",
    titleKey: "home.carousel.programs.title",
    descriptionKey: "home.carousel.programs.description",
    image: "/images/card-3.png",
    alt: "Tamil language learning programs",
    link: "/classes",
    linkTextKey: "home.carousel.programs.link",
  },
  {
    id: "cultural",
    type: "culture",
    titleKey: "home.carousel.culture.title",
    descriptionKey: "home.carousel.culture.description",
    image: "/images/banner-1.png",
    alt: "Students performing cultural dance on stage",
  },
  {
    id: "community",
    type: "community",
    titleKey: "home.carousel.community.title",
    descriptionKey: "home.carousel.community.description",
    image: "/images/banner-2.png",
    alt: "Community gathering and support event",
  },
  {
    id: "success",
    type: "success",
    titleKey: "home.carousel.success.title",
    descriptionKey: "home.carousel.success.description",
    image: "/images/card-5.png",
    alt: "Successful Tamil students",
  },
  {
    id: "stem",
    type: "programs",
    titleKey: "home.carousel.stem.title",
    descriptionKey: "home.carousel.stem.description",
    image: "/images/banner-3.png",
    alt: "Children participating in STEM workshop",
  },
];
