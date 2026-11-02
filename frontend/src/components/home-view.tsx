"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  ArticleSummary,
  AuthorSummary,
  Category,
  BookmarkedArticle,
  fetchFollowingFeed,
  fetchBookmarks,
  toggleFollowAuthor,
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
  PenTool,
  Bookmark,
  Rss,
  Shield,
  LayoutDashboard,
  Calendar,
  CheckCircle2,
  Cpu,
  Database,
  Lock,
  UserCheck,
  UserPlus,
  Clock,
  ChevronRight,
  Flame,
} from "lucide-react";

interface HomeViewProps {
  featured: ArticleSummary[];
  trending: ArticleSummary[];
  latest: ArticleSummary[];
  categories: Category[];
  authors: AuthorSummary[];
  databaseHealthy: boolean;
}

export function HomeView({
  featured,
  trending,
  latest,
  categories,
  authors,
  databaseHealthy,
}: HomeViewProps) {
  const { user, profile, accessToken } = useAuth();

  // Feed selection in Authenticated Workspace
  const [activeFeedTab, setActiveFeedTab] = useState<"for-you" | "following" | "latest" | "bookmarks">("for-you");
  const [followingArticles, setFollowingArticles] = useState<ArticleSummary[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState<boolean>(false);
  const [userBookmarks, setUserBookmarks] = useState<BookmarkedArticle[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  // Load user network & bookmarks when authenticated
  useEffect(() => {
    if (!accessToken || !user) return;

    // Load following feed
    setIsLoadingFollowing(true);
    fetchFollowingFeed(accessToken, 1, 10).then((res) => {
      setIsLoadingFollowing(false);
      if (res.success && res.data?.articles) {
        setFollowingArticles(res.data.articles);
      }
    });

    // Load saved bookmarks
    fetchBookmarks(accessToken, 1, 5).then((res) => {
      if (res.success && res.data?.bookmarks) {
        setUserBookmarks(res.data.bookmarks);
      }
    });

    // Initialize authors following map
    const map: Record<string, boolean> = {};
    authors.forEach((a) => {
      if (a.username !== profile?.username) {
        map[a.username] = true;
      }
    });
    setFollowingMap(map);
  }, [accessToken, user, authors, profile?.username]);

  const handleToggleFollow = async (username: string) => {
    if (!accessToken) return;
    const res = await toggleFollowAuthor(accessToken, username);
    if (res.success && res.data) {
      setFollowingMap((prev) => ({
        ...prev,
        [username]: res.data!.following,
      }));
    }
  };

  /* ========================================================================= */
  /* LAYOUT 1: LOGGED IN — DEVELOPER WORKSPACE / DASHBOARD LAYOUT             */
  /* ========================================================================= */
  if (user) {
    const isAdmin = user.role === "admin" || user.role === "super_admin";

    // Determine articles to display based on active feed tab
    let displayArticles = latest;
    if (activeFeedTab === "for-you") {
      displayArticles = [...featured, ...trending.slice(0, 2)];
      if (displayArticles.length === 0) displayArticles = latest;
    } else if (activeFeedTab === "following") {
      displayArticles = followingArticles;
    } else if (activeFeedTab === "bookmarks") {
      displayArticles = userBookmarks;
    }

    return (
      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* TOP COCKPIT: Developer Command Center */}
        <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-zinc-800/80 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <Terminal className="w-3.5 h-3.5" />
                <span>DEVELOPER WORKSPACE // ACTIVE SESSION</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
                Welcome back,{" "}
                <span className="text-emerald-400">
                  {profile?.display_name || profile?.username || "Architect"}
                </span>
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono">
                <span>@{profile?.username}</span>
                <span>&bull;</span>
                <Badge variant="outline" className="text-[10px] uppercase border-emerald-500/30 text-emerald-300">
                  {user.role}
                </Badge>
                <span>&bull;</span>
                <span className="text-zinc-500">
                  Production Node: <strong className="text-zinc-300">writnexa-cluster-01</strong>
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/studio/articles/new">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold gap-2 font-mono text-xs shadow-md">
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Write New Deep Dive</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 gap-2 font-mono text-xs">
                  <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Author Workspace</span>
                </Button>
              </Link>
              <Link href="/settings?tab=network">
                <Button variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 gap-2 font-mono text-xs">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Manage Network</span>
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" className="border-amber-700/60 bg-amber-950/20 hover:bg-amber-950/40 text-amber-300 gap-2 font-mono text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin Center</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <Link
              href="/settings?tab=network"
              className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
            >
              <span className="text-zinc-500 block text-[10px] uppercase">Engineers You Follow</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  {Object.values(followingMap).filter(Boolean).length}
                </span>
                <Rss className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            </Link>

            <Link
              href="/settings?tab=bookmarks"
              className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
            >
              <span className="text-zinc-500 block text-[10px] uppercase">Saved Bookmarks</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">
                  {userBookmarks.length}
                </span>
                <Bookmark className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
              </div>
            </Link>

            <Link
              href="/dashboard/drafts"
              className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
            >
              <span className="text-zinc-500 block text-[10px] uppercase">Your Studio Drafts</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  0 Active
                </span>
                <PenTool className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            </Link>

            <Link
              href="/settings?tab=profile"
              className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-all group"
            >
              <span className="text-zinc-500 block text-[10px] uppercase">Account Settings</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-semibold text-zinc-300 group-hover:text-emerald-400 transition-colors">
                  Manage Profile &rarr;
                </span>
                <Calendar className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </div>
            </Link>
          </div>
        </section>

        {/* 3-COLUMN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* LEFT RAIL: Navigation & Quick Topics (1 Col) */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold uppercase tracking-wider">Workspace Feeds</span>
              </div>
              <div className="space-y-1 font-mono text-xs">
                <button
                  onClick={() => setActiveFeedTab("for-you")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeFeedTab === "for-you"
                      ? "bg-zinc-800 text-emerald-400 font-bold border border-emerald-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> For You (Curated)
                  </span>
                  <Badge variant="outline" className="text-[10px] border-zinc-700">Top</Badge>
                </button>

                <button
                  onClick={() => setActiveFeedTab("following")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeFeedTab === "following"
                      ? "bg-zinc-800 text-emerald-400 font-bold border border-emerald-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Rss className="w-3.5 h-3.5" /> Following Feed
                  </span>
                  <Badge variant="outline" className="text-[10px] border-zinc-700">
                    {followingArticles.length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveFeedTab("latest")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeFeedTab === "latest"
                      ? "bg-zinc-800 text-emerald-400 font-bold border border-emerald-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" /> Platform Latest
                  </span>
                  <Badge variant="outline" className="text-[10px] border-zinc-700">
                    {latest.length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveFeedTab("bookmarks")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    activeFeedTab === "bookmarks"
                      ? "bg-zinc-800 text-amber-400 font-bold border border-amber-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Bookmark className="w-3.5 h-3.5" /> Saved Bookmarks
                  </span>
                  <Badge variant="outline" className="text-[10px] border-zinc-700">
                    {userBookmarks.length}
                  </Badge>
                </button>
              </div>
            </div>

            {/* Quick Topic Radar */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="font-semibold uppercase tracking-wider">Core Architecture Topics</span>
                <Link href="/topics" className="text-emerald-400 hover:underline text-[11px]">
                  All &rarr;
                </Link>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <Link key={c.id} href={`/topic/${c.slug}`}>
                    <Badge
                      variant="outline"
                      className="border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-300 font-mono text-xs py-1 transition-colors cursor-pointer"
                    >
                      {c.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* CENTER: Main Dynamic Feed (2 Cols) */}
          <main className="lg:col-span-2 space-y-6">
            {/* Quick Technical Draft Prompt */}
            <div className="p-4 rounded-xl border border-zinc-800/90 bg-gradient-to-r from-zinc-900/60 to-zinc-950 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">
                    Documented a new systems architecture breakthrough?
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    Share your benchmarks, Go concurrency patterns, or database optimizations.
                  </p>
                </div>
              </div>
              <Link href="/studio/articles/new" className="shrink-0">
                <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-mono text-xs h-8 border border-zinc-700">
                  Draft Article &rarr;
                </Button>
              </Link>
            </div>

            {/* Feed Content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  {activeFeedTab === "for-you" && (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Curated For Your Architecture Stack</span>
                    </>
                  )}
                  {activeFeedTab === "following" && (
                    <>
                      <Rss className="w-4 h-4 text-emerald-400" />
                      <span>Publications from Engineers You Follow</span>
                    </>
                  )}
                  {activeFeedTab === "latest" && (
                    <>
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span>Platform Chronological Stream</span>
                    </>
                  )}
                  {activeFeedTab === "bookmarks" && (
                    <>
                      <Bookmark className="w-4 h-4 text-amber-400" />
                      <span>Your Saved Offline Reading</span>
                    </>
                  )}
                </h2>
                <span className="text-xs font-mono text-zinc-500">
                  {displayArticles.length} publications
                </span>
              </div>

              {isLoadingFollowing && activeFeedTab === "following" ? (
                <div className="py-12 text-center font-mono text-xs text-zinc-500 animate-pulse">
                  Loading following feed stream...
                </div>
              ) : displayArticles.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800 text-zinc-500 space-y-3 font-mono text-xs">
                  <Terminal className="w-8 h-8 mx-auto opacity-40 text-emerald-400" />
                  <p>
                    {activeFeedTab === "following"
                      ? "You haven't followed any authors who have published yet."
                      : "No publications found in this view."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveFeedTab("latest")}
                    className="border-zinc-700 text-xs font-mono text-zinc-300"
                  >
                    Switch to Platform Stream
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayArticles.map((art) => (
                    <ArticleCard key={art.id} article={art} />
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* RIGHT RAIL: Network & Social + Quick Bookmarks (1 Col) */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Suggested & Followed Engineers */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold uppercase tracking-wider">Your Network</span>
                </div>
                <Link
                  href="/settings?tab=network"
                  className="text-xs font-mono text-emerald-400 hover:underline"
                >
                  Manage
                </Link>
              </div>

              <div className="space-y-3">
                {authors
                  .filter((a) => a.username !== profile?.username)
                  .slice(0, 4)
                  .map((a) => {
                    const isFollowing = followingMap[a.username] ?? true;

                    return (
                      <div
                        key={a.user_id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {a.avatar_url ? (
                            <img
                              src={a.avatar_url}
                              alt={a.display_name}
                              className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-emerald-400 shrink-0">
                              {a.display_name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/author/${a.username}`}
                              className="font-semibold text-zinc-200 hover:text-emerald-400 transition-colors truncate block"
                            >
                              {a.display_name}
                            </Link>
                            <span className="text-[11px] font-mono text-zinc-500 truncate block">
                              @{a.username}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant={isFollowing ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleFollow(a.username)}
                          className={`h-7 px-2 font-mono text-[10px] ${
                            isFollowing
                              ? "border-zinc-700 hover:border-rose-700 hover:bg-rose-950/30 hover:text-rose-300 text-zinc-300"
                              : "bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold"
                          }`}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Quick Saved Bookmarks */}
            {userBookmarks.length > 0 && (
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                    <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-semibold uppercase tracking-wider">Quick Reading List</span>
                  </div>
                  <Link
                    href="/settings?tab=bookmarks"
                    className="text-xs font-mono text-emerald-400 hover:underline"
                  >
                    All ({userBookmarks.length})
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {userBookmarks.slice(0, 3).map((b) => (
                    <Link
                      key={b.id}
                      href={`/article/${b.slug}`}
                      className="block p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900 transition-colors space-y-1 group"
                    >
                      <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {b.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                        <span>By {b.author.display_name}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {b.reading_time_minutes}m
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  }

  /* ========================================================================= */
  /* LAYOUT 2: GUEST / VISITOR LAYOUT (Logged Out)                            */
  /* ========================================================================= */
  return (
    <div className="container mx-auto px-4 py-8 space-y-16">
      {/* High-Impact Hero Landing Section */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/50 via-zinc-950 to-zinc-950 p-8 sm:p-14 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>PRODUCTION-GRADE DEVELOPER ECOSYSTEM</span>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-100">
            Where Software Architects and Engineers Publish Deep Knowledge
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 font-sans leading-relaxed">
            No generic listicles. Read complete technical deep-dives into Go concurrency, PostgreSQL internals, distributed consensus, and Next.js systems architecture without login or paywalls.
          </p>
        </div>

        {/* Guest Conversion CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/register">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold gap-2 font-mono text-sm shadow-xl">
              <Sparkles className="w-4 h-4" />
              <span>Create Free Developer Account</span>
            </Button>
          </Link>
          <Link href="/explore">
            <Button size="lg" variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 gap-2 font-mono text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Explore Technical Deep-Dives</span>
            </Button>
          </Link>
        </div>

        {/* Architecture Categories Bar */}
        <div className="pt-6 border-t border-zinc-800/80 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-mono text-zinc-500 mr-2">Core Topics:</span>
          {categories.map((c) => (
            <Link key={c.id} href={`/topic/${c.slug}`}>
              <Badge
                variant="outline"
                className="border-zinc-800 hover:border-emerald-500/50 hover:text-emerald-300 font-mono text-xs py-1 transition-colors cursor-pointer"
              >
                {c.name}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      {/* WHY WRITNEXA: Guest Value Proposition Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-zinc-100 text-lg">Zero Generic Content</h3>
          <p className="text-sm text-zinc-400 font-sans leading-relaxed">
            Every publication is verified with code traces, real flamegraphs, and benchmarks. Written by engineers who build production systems.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-zinc-100 text-lg">Database & Distributed Systems</h3>
          <p className="text-sm text-zinc-400 font-sans leading-relaxed">
            In-depth breakdowns of MVCC concurrency, Raft consensus, LSM-Tree compaction, and high-throughput Kafka streaming pipelines.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-zinc-100 text-lg">Open & Free Forever</h3>
          <p className="text-sm text-zinc-400 font-sans leading-relaxed">
            No paywalls, medium-style popups, or subscriptions. All knowledge is public, indexable, and accessible to developers worldwide.
          </p>
        </div>
      </section>

      {/* Featured Architecture Insights */}
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
              <span>View archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {latest.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>
        </section>

        {/* Right Sidebar: Trending & Top Authors */}
        <aside className="space-y-8">
          {/* Guest Sign Up Pitch */}
          <div className="p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-zinc-950 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
              <Sparkles className="w-4 h-4" />
              <span>JOIN 15,000+ ENGINEERS</span>
            </div>
            <h3 className="text-base font-bold text-zinc-100">
              Personalize your feed and follow software architects
            </h3>
            <p className="text-xs text-zinc-400">
              Create an account to bookmark technical deep dives, follow top engineering authors, and receive in-app notifications when new system designs are published.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/register">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs">
                  Create Free Account
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-zinc-400 hover:text-zinc-200 font-mono text-xs">
                  Sign In to Existing Account
                </Button>
              </Link>
            </div>
          </div>

          {/* Trending Insights */}
          {trending.length > 0 && (
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center gap-2 text-zinc-200 font-bold">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Trending Deep Dives</span>
              </div>
              <div className="space-y-3">
                {trending.map((art, idx) => (
                  <Link
                    key={art.id}
                    href={`/article/${art.slug}`}
                    className="flex items-start gap-3 group"
                  >
                    <span className="font-mono text-lg font-bold text-zinc-600 group-hover:text-emerald-400 transition-colors">
                      0{idx + 1}
                    </span>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-300 group-hover:text-emerald-400 transition-colors line-clamp-2">
                        {art.title}
                      </h4>
                      <p className="text-xs font-mono text-zinc-500">
                        By {art.author.display_name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top Authors */}
          {authors.length > 0 && (
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-200 font-bold">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Verified Authors</span>
                </div>
                <Link
                  href="/authors"
                  className="text-xs font-mono text-emerald-400 hover:underline"
                >
                  View all &rarr;
                </Link>
              </div>
              <div className="space-y-3">
                {authors.map((a) => (
                  <AuthorCard key={a.user_id} author={a} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

