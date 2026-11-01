import Link from "next/link";
import {
  fetchFeaturedArticles,
  fetchTrendingArticles,
  fetchArticles,
  fetchCategories,
  fetchAuthors,
  fetchHealth,
} from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { AuthorCard } from "@/components/author-card";
import { AdPlacement } from "@/components/ad-placement";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  BookOpen,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Layers,
  Users,
  Compass,
} from "lucide-react";

export const revalidate = 30; // SSR with 30s cache revalidation

export default async function HomePage() {
  const [
    featuredRes,
    trendingRes,
    latestRes,
    categoriesRes,
    authorsRes,
    healthRes,
  ] = await Promise.all([
    fetchFeaturedArticles(4),
    fetchTrendingArticles(4),
    fetchArticles({ per_page: 6, sort: "latest" }),
    fetchCategories(),
    fetchAuthors(1, 3),
    fetchHealth(),
  ]);

  const featured = featuredRes.data?.articles || [];
  const trending = trendingRes.data?.articles || [];
  const latest = latestRes.data?.articles || [];
  const categories = categoriesRes.data?.categories || [];
  const authors = authorsRes.data?.authors || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 via-zinc-950/80 to-zinc-950 p-8 sm:p-14 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>PRODUCTION-GRADE DEVELOPER ECOSYSTEM</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 max-w-4xl mx-auto leading-tight">
          Where Software Architects and Engineers Publish <span className="text-emerald-400">Deep Knowledge</span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto font-sans leading-relaxed">
          No generic listicles. Read complete technical deep-dives into Go concurrency, PostgreSQL internals, distributed consensus, and Next.js systems architecture without login or paywalls.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/explore">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold px-6 gap-2">
              <Compass className="w-4 h-4" />
              <span>Explore All Articles</span>
            </Button>
          </Link>
          <Link href="/topics">
            <Button variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 gap-2">
              <Layers className="w-4 h-4" />
              <span>Browse Topics</span>
            </Button>
          </Link>
          <Link href="/studio">
            <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100 font-mono text-xs">
              Become an Author &rarr;
            </Button>
          </Link>
        </div>

        {/* Quick Topic Pills */}
        <div className="pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-mono text-zinc-500 mr-2">Core Topics:</span>
          {categories.map((c) => (
            <Link key={c.id} href={`/topic/${c.slug}`}>
              <Badge
                variant="outline"
                className="bg-zinc-900/80 border-zinc-700/80 hover:border-emerald-500/60 text-zinc-300 hover:text-emerald-300 font-mono text-xs py-1 transition-colors"
              >
                {c.name}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      {/* Homepage Top Advertisement Placement */}
      <AdPlacement slotKey="homepage_top" className="my-8" />

      {/* Featured Section */}
      {featured.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                Featured Architecture Insights
              </h2>
            </div>
            <Link
              href="/explore?sort=featured"
              className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>View all featured</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featured.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        </section>
      )}

      {/* Main Two-Column Layout: Latest Feed + Trending / Authors Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column (2 Cols): Latest Articles */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                Latest Publications
              </h2>
            </div>
            <Link
              href="/explore"
              className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Explore all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {latest.length > 0 ? (
              latest.map((art) => <ArticleCard key={art.id} article={art} />)
            ) : (
              <div className="p-8 rounded-lg border border-zinc-800 bg-zinc-900/30 text-center text-zinc-500 font-mono text-sm">
                No published articles found.
              </div>
            )}
          </div>
        </section>

        {/* Right Column (1 Col): Trending & Authors */}
        <div className="space-y-10">
          {/* Trending Shelf */}
          {trending.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-lg font-bold tracking-tight text-zinc-100">
                    Trending This Week
                  </h3>
                </div>
                <Link
                  href="/explore?sort=trending"
                  className="text-xs font-mono text-zinc-400 hover:text-emerald-400"
                >
                  More
                </Link>
              </div>

              <div className="space-y-3">
                {trending.map((art, idx) => (
                  <Link
                    key={art.id}
                    href={`/article/${art.slug}`}
                    className="group block p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono font-bold text-lg text-zinc-600 group-hover:text-emerald-400">
                        0{idx + 1}
                      </span>
                      <div className="space-y-1 min-w-0">
                        <span className="text-xs font-mono text-zinc-500 block">
                          @{art.author?.username || "author"}
                        </span>
                        <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 line-clamp-2 leading-snug">
                          {art.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 pt-1">
                          <span>{art.reading_time_minutes}m read</span>
                          <span>&bull;</span>
                          <span>{art.views_count} views</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Featured Authors Shelf */}
          {authors.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-lg font-bold tracking-tight text-zinc-100">
                    Top Authors
                  </h3>
                </div>
                <Link
                  href="/authors"
                  className="text-xs font-mono text-zinc-400 hover:text-emerald-400"
                >
                  View all
                </Link>
              </div>

              <div className="space-y-4">
                {authors.map((author) => (
                  <AuthorCard key={author.user_id} author={author} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Backend Health Telemetry Widget */}
      {healthRes.data && (
        <section className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/60 font-mono text-xs flex flex-wrap items-center justify-between gap-4 text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-300 font-semibold">Backend Engine:</span>
            <span>Go Gin {healthRes.data.version ? `v${healthRes.data.version}` : "v1.0 (Live)"}</span>
          </div>

          <div className="flex items-center gap-6">
            <span>
              System:{" "}
              <strong className="text-emerald-400">
                {healthRes.data.status || "operational"}
              </strong>
            </span>
            {healthRes.data.services?.database && (
              <span>
                DB:{" "}
                <strong className="text-emerald-400">
                  {healthRes.data.services.database.status} ({healthRes.data.services.database.latency})
                </strong>
              </span>
            )}
            {healthRes.data.services?.redis && (
              <span>
                Redis:{" "}
                <strong className="text-emerald-400">
                  {healthRes.data.services.redis.status} ({healthRes.data.services.redis.latency})
                </strong>
              </span>
            )}
            {healthRes.data.uptime_seconds && <span>Uptime: {healthRes.data.uptime_seconds}s</span>}
          </div>
        </section>
      )}
    </div>
  );
}
