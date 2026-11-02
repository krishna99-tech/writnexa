import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://writnexa.dev";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/explore",
          "/topics",
          "/topic/*",
          "/tags",
          "/tag/*",
          "/authors",
          "/author/*",
          "/article/*",
        ],
        disallow: [
          "/admin/*",
          "/studio/*",
          "/api/*",
          "/settings/*",
          "/verify-email",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

