import type { MetadataRoute } from "next";

//const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
const SITE_URL = "https://app.gsdta.com/";
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "/",
    "/about/",
    "/calendar/",
    "/contact/",
    "/documents/",
    "/donate/",
    "/enrollment/",
    "/register/",
    "/team/",
    "/textbooks/",
  ];

  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
