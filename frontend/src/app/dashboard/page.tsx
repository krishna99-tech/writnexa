"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchStudioArticles, fetchAuthorAnalytics, fetchMyProfile, StudioArticleSummary } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Eye,
  Heart,
  TrendingUp,
  Clock,
  PenSquare,
  Sparkles,
  BarChart3,
  User,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Layers,
} from "lucide-react";

export default function WorkspaceOverviewPage() {
  const { user, profile, accessToken } = useAuth();
  const [articles, setArticles] = useState<StudioArticleSummary[]>([]);
  const [metrics, setMetrics] = useState<{
    totalViews: number;
    totalLikes: number;
    publishedCount: number;
    draftCount: number;
  }>({
    totalViews: 0,
    totalLikes: 0,
    publishedCount: 0,
    draftCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    Promise.all([
      fetchStudioArticles(accessToken),
      fetchAuthorAnalytics(accessToken, { range: "30d" }).catch(() => ({ success: false, data: null })),
    ]).then(([artRes, analRes]) => {
      setLoading(false);
      if (artRes.success && artRes.data?.articles) {
        const all = artRes.data.articles;
        setArticles(all);

        const published = all.filter((a) => a.status === "published");
        const drafts = all.filter((a) => a.status === "draft");
        const totalViews = all.reduce((acc, a) => acc + (a.views_count || 0), 0);
        const totalLikes = all.reduce((acc, a) => acc + (a.likes_count || 0), 0);

        setMetrics({
          totalViews,
          totalLikes,
          publishedCount: published.length,
          draftCount: drafts.length,
        });
      }
    });
  }, [accessToken]);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-3">
            <span>Welcome back, {profile?.display_name || user?.email?.split("@")[0]}</span>
            <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400">
              Active Author
            </span>
          </h1>
          <p className="text-sm text-zinc-400 font-mono mt-1">
            Manage your technical essays, analyze readership engagement, and edit your profile.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link href="/studio/articles/new">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs">
              <PenSquare className="w-4 h-4" />
              <span>Write Article</span>
            </Button>
          </Link>
          <Link href="/dashboard/analytics">
            <Button variant="outline" className="border-zinc-800 font-mono text-xs text-zinc-300">
              <BarChart3 className="w-4 h-4 mr-1.5 text-zinc-400" />
              <span>Analytics</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/40 border-zinc-800/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Published Articles</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-mono font-bold text-zinc-100">
              {loading ? "..." : metrics.publishedCount}
            </span>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-2">
            Live and indexable technical posts
          </p>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Active Drafts</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-mono font-bold text-zinc-100">
              {loading ? "..." : metrics.draftCount}
            </span>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-2">
            In progress or pending publication
          </p>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Total Article Reads</span>
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-mono font-bold text-zinc-100">
              {loading ? "..." : metrics.totalViews.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-2">
            Verified platform readers & impressions
          </p>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800/80 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Reader Reactions</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-mono font-bold text-zinc-100">
              {loading ? "..." : metrics.totalLikes.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 mt-2">
            Community endorsements & claps
          </p>
        </Card>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/articles" className="group">
          <Card className="bg-zinc-900/40 border-zinc-800/80 p-5 hover:border-emerald-500/50 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <h3 className="font-mono font-bold text-sm text-zinc-200 mt-4 group-hover:text-emerald-300 transition-colors">
              Manage Articles & Drafts
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-1">
              Edit published essays, schedule releases, manage tags, and review editorial feedback.
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/profile" className="group">
          <Card className="bg-zinc-900/40 border-zinc-800/80 p-5 hover:border-emerald-500/50 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <User className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="font-mono font-bold text-sm text-zinc-200 mt-4 group-hover:text-purple-300 transition-colors">
              Public Profile & Bio
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-1">
              Update avatar, cover image, headline, developer social links, and author credentials.
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/settings" className="group">
          <Card className="bg-zinc-900/40 border-zinc-800/80 p-5 hover:border-emerald-500/50 transition-colors h-full">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="font-mono font-bold text-sm text-zinc-200 mt-4 group-hover:text-blue-300 transition-colors">
              Account & Security
            </h3>
            <p className="text-xs text-zinc-400 font-sans mt-1">
              Manage active sessions, rotate password, adjust notification preferences, and privacy controls.
            </p>
          </Card>
        </Link>
      </div>

      {/* Recent Activity / Articles Table */}
      <Card className="bg-zinc-900/30 border-zinc-800/80">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/60 pb-4">
          <div>
            <CardTitle className="font-mono text-base text-zinc-100">Recent Publications & Drafts</CardTitle>
            <CardDescription className="text-xs text-zinc-400 font-mono">
              Your latest technical content in the ecosystem
            </CardDescription>
          </div>
          <Link href="/dashboard/articles">
            <Button variant="ghost" size="sm" className="font-mono text-xs text-zinc-400 hover:text-emerald-400">
              View all &rarr;
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center font-mono text-xs text-zinc-500">
              Loading recent articles...
            </div>
          ) : articles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-mono text-zinc-400">You have not created any articles yet.</p>
              <Link href="/studio/articles/new">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs">
                  Create First Article
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {articles.slice(0, 5).map((art) => (
                <div key={art.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={art.status === "published" ? "default" : "secondary"}
                        className="text-[10px] font-mono capitalize"
                      >
                        {art.status}
                      </Badge>
                      <span className="text-xs font-mono text-zinc-500">
                        {new Date(art.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Link
                      href={art.status === "published" ? `/article/${art.slug}` : `/studio/articles/${art.id}/edit`}
                      className="font-medium text-sm text-zinc-200 hover:text-emerald-400 transition-colors line-clamp-1"
                    >
                      {art.title}
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                      {art.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-zinc-500" />
                      {art.likes_count || 0}
                    </span>
                    <Link href={`/studio/articles/${art.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-800">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
