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
  title: string;
  description?: string;
  image: string; // public path under /images
  alt: string;
}

export const slides: Slide[] = [
  {
    id: "cultural",
    title: "Cultural events",
    description: "Celebrating Tamil arts and heritage together.",
    image: "/images/banner-1.png",
    alt: "Students performing cultural dance on stage",
  },
  {
    id: "community",
    title: "Community support",
    description: "Volunteers and parents powering our mission.",
    image: "/images/banner-2.png",
    alt: "Community gathering and support event",
  },
  {
    id: "stem",
    title: "STEM workshops",
    description: "Hands-on learning that inspires curiosity.",
    image: "/images/banner-3.png",
    alt: "Children participating in STEM workshop",
  },
  {
    id: "fieldtrips",
    title: "Field trips",
    description: "Exploring beyond the classroom.",
    image: "/images/banner-4.png",
    alt: "Students on an educational field trip",
  },
];

