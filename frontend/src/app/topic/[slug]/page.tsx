import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCategory, fetchArticles } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Button } from "@/components/ui/button";
import { Layers, ArrowLeft } from "lucide-react";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await fetchCategory(slug);
  if (!res.success || !res.data?.category) {
    return { title: "Topic Not Found | QUORIX" };
  }

  const cat = res.data.category;
  return {
    title: `${cat.name} — Technical Articles | QUORIX`,
    description: cat.description || `Read engineering essays on ${cat.name} on QUORIX.`,
  };
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [catRes, artsRes] = await Promise.all([
    fetchCategory(slug),
    fetchArticles({ category: slug, per_page: 20 }),
  ]);

  if (!catRes.success || !catRes.data?.category) {
    notFound();
  }

  const category = catRes.data.category;
  const articles = artsRes.data?.articles || [];

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Back Navigation */}
      <div>
        <Link
          href="/topics"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Topics</span>
        </Link>
      </div>

      {/* Header */}
      <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Layers className="w-4 h-4" />
          <span>topic_feed // {category.slug}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-sm text-zinc-400 font-sans max-w-3xl leading-relaxed">
            {category.description}
          </p>
        )}
      </div>

      {/* Articles Feed */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-zinc-200">
          Published Deep-Dives ({articles.length})
        </h2>

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/30 text-zinc-500 font-mono text-sm">
            No articles published under this topic yet.
          </div>
        )}
      </div>
    </div>
  );
}

