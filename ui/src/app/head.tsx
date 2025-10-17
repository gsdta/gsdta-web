// Central head entries not covered by Next metadata API
export default function Head() {
  const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GSDTA Tamil School",
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
  };
  return (
    <>
      {/* Prefer light/dark for native UI elements */}
      <meta name="color-scheme" content="light dark" />
      {/* Organization JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
    </>
  );
}

