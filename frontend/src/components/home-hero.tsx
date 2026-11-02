"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Terminal,
  Compass,
  Layers,
  PenTool,
  Rss,
  Bookmark,
  Shield,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

interface CategoryPill {
  id: string;
  name: string;
  slug: string;
}

interface HomeHeroProps {
  categories: CategoryPill[];
}

export function HomeHero({ categories }: HomeHeroProps) {
  const { user, profile } = useAuth();

  // 1. Authenticated User Cockpit Hero
  if (user) {
    const isAdmin = user.role === "admin" || user.role === "super_admin";

    return (
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/70 via-zinc-950/80 to-zinc-950 p-8 sm:p-12 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <Terminal className="w-3.5 h-3.5" />
              <span>DEVELOPER WORKSPACE ACTIVE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100">
              Welcome back,{" "}
              <span className="text-emerald-400">
                {profile?.display_name || profile?.username || "Developer"}
              </span>
            </h1>
            <p className="text-sm text-zinc-400 font-sans">
              Signed in as <code className="text-zinc-200 font-mono">@{profile?.username}</code> with{" "}
              <Badge variant="outline" className="text-xs font-mono capitalize ml-1 border-emerald-500/30 text-emerald-300">
                {user.role}
              </Badge>{" "}
              privileges.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/studio/articles/new">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs">
                <PenTool className="w-3.5 h-3.5" />
                <span>Write Article</span>
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 gap-2 font-mono text-xs">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Author Workspace</span>
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

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Link
            href="/feed/following"
            className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all group space-y-1.5"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-emerald-400 transition-colors">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Following Feed</span>
              <Rss className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-500 font-sans">
              Read new publications from authors and engineers you follow.
            </p>
          </Link>

          <Link
            href="/library/bookmarks"
            className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all group space-y-1.5"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-amber-400 transition-colors">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Saved Bookmarks</span>
              <Bookmark className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-500 font-sans">
              Access your personal reading list of architecture deep-dives.
            </p>
          </Link>

          <Link
            href="/explore"
            className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all group space-y-1.5"
          >
            <div className="flex items-center justify-between text-zinc-400 group-hover:text-sky-400 transition-colors">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider">Explore Articles</span>
              <Compass className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-500 font-sans">
              Discover latest Go, Postgres, Kubernetes, and eBPF publications.
            </p>
          </Link>
        </div>

        {/* Quick Topic Pills */}
        <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
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
    );
  }

  // 2. Anonymous / Guest Public Marketing Hero
  return (
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
        <Link href="/become-author">
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
  );
}
