import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTag, fetchArticles } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Hash, ArrowLeft } from "lucide-react";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await fetchTag(slug);
  if (!res.success || !res.data?.tag) {
    return { title: "Tag Not Found | QUORIX" };
  }

  const tag = res.data.tag;
  return {
    title: `#${tag.name} — Technical Articles | QUORIX`,
    description: tag.description || `Read engineering essays tagged with #${tag.name} on QUORIX.`,
  };
}

export default async function TagDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [tagRes, artsRes] = await Promise.all([
    fetchTag(slug),
    fetchArticles({ tag: slug, per_page: 20 }),
  ]);

  if (!tagRes.success || !tagRes.data?.tag) {
    notFound();
  }

  const tag = tagRes.data.tag;
  const articles = artsRes.data?.articles || [];

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12 space-y-8">
      <div>
        <Link
          href="/tags"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Tags</span>
        </Link>
      </div>

      <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Hash className="w-4 h-4" />
          <span>tag_feed // #{tag.slug}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
          #{tag.name}
        </h1>
        {tag.description && (
          <p className="text-sm text-zinc-400 font-sans max-w-3xl leading-relaxed">
            {tag.description}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-200">
          Articles with #{tag.name} ({articles.length})
        </h2>

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/30 text-zinc-500 font-mono text-sm">
            No articles tagged with #{tag.name} yet.
          </div>
        )}
      </div>
    </div>
  );
}
