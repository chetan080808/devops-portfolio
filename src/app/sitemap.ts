import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", site.meta.siteUrl).toString(), changeFrequency: "monthly", priority: 1 }];
}
