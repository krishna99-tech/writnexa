import type { MetadataRoute } from "next";
import { fetchArticles, fetchCategories } from "@/lib/api";

export const revalidate = 3600; // Cache sitemap for 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://quorix.io";

  // Static core routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/topics`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/authors`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Dynamic public articles
  let articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const articlesRes = await fetchArticles({ per_page: 50, sort: "latest" });
    if (articlesRes.success && articlesRes.data?.articles) {
      articleRoutes = articlesRes.data.articles.map((art) => ({
        url: `${baseUrl}/article/${art.slug}`,
        lastModified: art.published_at ? new Date(art.published_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.85,
      }));
    }
  } catch {
    // Graceful fallback to static routes if API offline during build
  }

  // Dynamic public categories / topics
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const catRes = await fetchCategories();
    if (catRes.success && catRes.data?.categories) {
      categoryRoutes = catRes.data.categories.map((c) => ({
        url: `${baseUrl}/topic/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.75,
      }));
    }
  } catch {
    // Graceful fallback
  }

  return [...staticRoutes, ...articleRoutes, ...categoryRoutes];
}
