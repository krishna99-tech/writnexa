import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchArticle } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Eye,
  Heart,
  Bookmark,
  Share2,
  Calendar,
  ArrowLeft,
  Terminal,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import {
  ArticleActionsBar,
  ArticleCommentsSection,
} from "@/components/article-interactions";
import { FollowButton } from "@/components/follow-button";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { AdPlacement } from "@/components/ad-placement";
import { MarkdownRenderer } from "@/components/markdown-editor";
import { LiveReaderTelemetry } from "@/components/live-reader-telemetry";
import { PeerReviewBadge } from "@/components/peer-review-badge";

export const revalidate = 30;

// Dynamic SEO & Open Graph Metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const res = await fetchArticle(slug);

  if (!res.success || !res.data?.article) {
    return {
      title: "Article Not Found | WRITNEXA",
      description: "The requested technical article could not be located.",
    };
  }

  const article = res.data.article;
  const desc =
    article.subtitle ||
    `Read ${article.title} by @${article.author.username} on WRITNEXA.`;

  return {
    title: `${article.title} — WRITNEXA`,
    description: desc,
    alternates: {
      canonical: article.canonical_url || `https://writnexa.dev/article/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: desc,
      type: "article",
      publishedTime: article.published_at,
      authors: [article.author.display_name || article.author.username],
      url: `https://writnexa.dev/article/${article.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: desc,
      creator: `@${article.author.username}`,
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await fetchArticle(slug);

  if (!res.success || !res.data?.article) {
    notFound();
  }

  const article = res.data.article;

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recently published";

  return (
    <article className="container max-w-3xl mx-auto px-4 py-12 space-y-10">
      <AnalyticsTracker eventType="article_view" articleId={article.id} />
      {/* Back Navigation */}
      <div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Explorer</span>
        </Link>
      </div>

      {/* Article Header */}
      <header className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {article.category && (
            <Link href={`/topic/${article.category.slug}`}>
              <Badge
                variant="outline"
                className="bg-emerald-950/30 border-emerald-800 text-emerald-400 font-mono text-xs"
              >
                {article.category.name}
              </Badge>
            </Link>
          )}
          <span className="text-zinc-600 font-mono text-xs">&bull;</span>
          <span className="text-zinc-400 font-mono text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{article.reading_time_minutes} min read</span>
          </span>
          <span className="text-zinc-600 font-mono text-xs">&bull;</span>
          <span className="text-zinc-400 font-mono text-xs flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{article.views_count} views</span>
          </span>
          <span className="text-zinc-600 font-mono text-xs">&bull;</span>
          <LiveReaderTelemetry articleSlug={article.slug} />
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-100 leading-tight">
          {article.title}
        </h1>

        {article.subtitle && (
          <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed font-sans">
            {article.subtitle}
          </p>
        )}

        {/* Author Bio Bar */}
        <div className="flex items-center justify-between border-y border-zinc-800/80 py-4">
          <Link
            href={`/author/${article.author.username}`}
            className="flex items-center gap-3 group"
          >
            {article.author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.author.avatar_url}
                alt={article.author.display_name}
                className="w-11 h-11 rounded-full object-cover border border-zinc-700 group-hover:border-emerald-500 transition-colors"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-sm text-emerald-400">
                {article.author.display_name?.[0] || article.author.username[0].toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors block text-sm">
                {article.author.display_name}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                @{article.author.username} &bull; {publishedDate}
              </span>
            </div>
          </Link>

          {/* Author Follow & Share */}
          <div className="flex items-center gap-2">
            <FollowButton targetUsername={article.author.username} />
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                article.title
              )}&url=${encodeURIComponent(`https://writnexa.dev/article/${article.slug}`)}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors text-xs font-mono flex items-center gap-1"
              title="Share on X / Twitter"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </a>
          </div>
        </div>

        {/* Top Interactive Actions Bar */}
        <ArticleActionsBar
          articleId={article.id}
          articleSlug={article.slug}
          articleTitle={article.title}
          authorId={article.author.username}
          initialLikesCount={article.likes_count}
          initialBookmarksCount={article.bookmarks_count}
          initialCommentsCount={article.comments_count}
        />
      </header>

      {/* Architecture Guild Peer Review Verdict */}
      <PeerReviewBadge articleSlug={article.slug} />

      {/* Main Technical Article Body */}
      <section className="max-w-none font-sans leading-relaxed text-base">
        {article.content ? (
          <MarkdownRenderer content={article.content} />
        ) : (
          <p className="text-zinc-500 font-mono text-sm">
            Content is being rendered...
          </p>
        )}
      </section>

      {/* In-Content Non-Intrusive Sponsored Placement */}
      <AdPlacement slotKey="article_in_content" className="my-8" />

      {/* Tags Section */}
      {article.tags && article.tags.length > 0 && (
        <div className="pt-6 border-t border-zinc-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-zinc-500 mr-2">Tags:</span>
          {article.tags.map((t) => (
            <Link key={t.slug} href={`/tag/${t.slug}`}>
              <Badge
                variant="outline"
                className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-400 font-mono text-xs py-1"
              >
                #{t.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom Actions Bar */}
      <ArticleActionsBar
        articleId={article.id}
        articleSlug={article.slug}
        articleTitle={article.title}
        authorId={article.author.username}
        initialLikesCount={article.likes_count}
        initialBookmarksCount={article.bookmarks_count}
        initialCommentsCount={article.comments_count}
      />

      {/* Interactive Comments & Discussions */}
      <ArticleCommentsSection
        articleId={article.id}
        articleSlug={article.slug}
      />

      {/* Article Sponsored Partner Placement */}
      <AdPlacement slotKey="article_sidebar" className="my-8" />

      {/* Bottom Author Shelf */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-start gap-4">
        {article.author.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.author.avatar_url}
            alt={article.author.display_name}
            className="w-14 h-14 rounded-full object-cover border-2 border-zinc-700 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center font-mono font-bold text-base text-emerald-400 shrink-0">
            {article.author.display_name?.[0] || article.author.username[0].toUpperCase()}
          </div>
        )}

        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href={`/author/${article.author.username}`}
                className="text-base font-bold text-zinc-100 hover:text-emerald-400 transition-colors"
              >
                Written by {article.author.display_name}
              </Link>
              <span className="text-xs font-mono text-zinc-500 block">
                @{article.author.username}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/author/${article.author.username}`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>Sponsor</span>
                </Button>
              </Link>
              <FollowButton targetUsername={article.author.username} />
              <Link href={`/author/${article.author.username}`}>
                <Button variant="outline" size="sm" className="border-zinc-700 font-mono text-xs">
                  View Profile
                </Button>
              </Link>
            </div>
          </div>

          {article.author.headline && (
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {article.author.headline}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
