import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAuthor, fetchAuthorArticles, fetchAuthorStats } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  MapPin,
  Globe,
  Github,
  Twitter,
  Linkedin,
  ArrowLeft,
  UserPlus,
  Eye,
  Heart,
  MessageSquare,
  Bookmark,
  Calendar,
} from "lucide-react";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const res = await fetchAuthor(username);
  if (!res.success || !res.data?.author) {
    return { title: "Author Not Found | QUORIX" };
  }

  const author = res.data.author;
  const desc =
    author.headline ||
    author.bio ||
    `Read software engineering and technical architecture articles by @${author.username} on QUORIX.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://quorix.io";

  return {
    title: `${author.display_name} (@${author.username}) — QUORIX`,
    description: desc,
    alternates: {
      canonical: `${siteUrl}/author/${author.username}`,
    },
    openGraph: {
      title: `${author.display_name} (@${author.username}) | QUORIX`,
      description: desc,
      url: `${siteUrl}/author/${author.username}`,
      type: "profile",
      images: author.avatar_url ? [{ url: author.avatar_url }] : [],
    },
    twitter: {
      card: "summary",
      title: `${author.display_name} (@${author.username})`,
      description: desc,
    },
  };
}

export default async function AuthorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [authorRes, artsRes, statsRes] = await Promise.all([
    fetchAuthor(username),
    fetchAuthorArticles(username, 1, 20),
    fetchAuthorStats(username),
  ]);

  if (!authorRes.success || !authorRes.data?.author) {
    notFound();
  }

  const author = authorRes.data.author;
  const articles = artsRes.data?.articles || [];
  const stats = statsRes.data?.stats;

  const joinedDate = author.joined_at
    ? new Date(author.joined_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-12 space-y-10">
      {/* Back Navigation */}
      <div>
        <Link
          href="/authors"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Authors</span>
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatar_url}
                alt={author.display_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/80 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-emerald-500/80 flex items-center justify-center font-mono font-bold text-2xl text-emerald-400 shadow-lg">
                {author.display_name?.[0] || author.username[0].toUpperCase()}
              </div>
            )}

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100">
                {author.display_name}
              </h1>
              <p className="text-sm font-mono text-emerald-400">@{author.username}</p>
            </div>
          </div>

          <Link href={`/login?return_to=/author/${author.username}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs">
              <UserPlus className="w-4 h-4" />
              <span>Follow Author</span>
            </Button>
          </Link>
        </div>

        {author.headline && (
          <p className="text-base text-zinc-300 font-sans font-medium leading-relaxed">
            {author.headline}
          </p>
        )}

        {author.bio && (
          <p className="text-sm text-zinc-400 font-sans leading-relaxed whitespace-pre-line">
            {author.bio}
          </p>
        )}

        {/* Telemetry & Socials */}
        <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-400">
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-zinc-200">{stats?.total_articles ?? author.article_count}</strong> Articles
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-zinc-200">{stats?.follower_count ?? author.follower_count}</strong> Followers
            </span>
            {author.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                <span>{author.location}</span>
              </span>
            )}
            {joinedDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>Joined {joinedDate}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {author.github_url && (
              <a
                href={author.github_url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            )}
            {author.twitter_url && (
              <a
                href={author.twitter_url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {author.linkedin_url && (
              <a
                href={author.linkedin_url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {author.website_url && (
              <a
                href={author.website_url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Website"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Author Metrics / Aggregate Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Published Articles</span>
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {stats.total_articles.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Total Readers / Views</span>
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {stats.total_views.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Appreciations / Likes</span>
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {stats.total_likes.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Bookmarks Saved</span>
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {stats.total_bookmarks.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Author's Published Articles */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-zinc-200">
            Published Articles ({articles.length})
          </h2>
        </div>

        {articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/30 text-zinc-500 font-mono text-sm">
            This author has not published any public articles yet.
          </div>
        )}
      </div>
    </div>
  );
}

