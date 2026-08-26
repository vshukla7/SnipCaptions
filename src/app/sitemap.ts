import type { MetadataRoute } from "next";
import { BLOGS } from "@/lib/blogs";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snipcaptions.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = BLOGS.map((b) => ({
    url: `${BASE}/blogs/${b.slug}`,
    lastModified: new Date(b.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/blogs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...posts,
  ];
}
