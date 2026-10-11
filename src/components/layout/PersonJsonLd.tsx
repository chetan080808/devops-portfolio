import { site } from "@/content/site";

/** schema.org Person for search results, built from site.ts. */
export function PersonJsonLd() {
  const { profile, meta, socials } = site;
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
    description: profile.pitch,
    url: meta.siteUrl,
    sameAs: socials.filter((s) => s.kind !== "email").map((s) => s.href),
  };
  return (
    <script
      type="application/ld+json"
      // Escaped "<" so content can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}
