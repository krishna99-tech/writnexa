import { fetchArticles } from "@/lib/api";

export const revalidate = 1800; // 30 minutes cache

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://writnexa.dev";
  const res = await fetchArticles({ per_page: 25, sort: "latest" });
  const articles = res.data?.articles || [];

  const itemsXml = articles
    .map(
      (a) => `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${baseUrl}/article/${a.slug}</link>
      <guid isPermaLink="true">${baseUrl}/article/${a.slug}</guid>
      <description><![CDATA[${a.subtitle || a.title}]]></description>
      <pubDate>${a.published_at ? new Date(a.published_at).toUTCString() : new Date().toUTCString()}</pubDate>
      <author><![CDATA[${a.author.display_name} (@${a.author.username})]]></author>
      ${a.category ? `<category>${a.category.name}</category>` : ""}
    </item>`
    )
    .join("");

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>WRITNEXA — Developer Publishing &amp; Technical Architecture</title>
    <link>${baseUrl}</link>
    <description>Peer-reviewed deep dives on software architecture, distributed systems, kernel telemetry, and compilers.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}

