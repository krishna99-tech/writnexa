"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchStudioOverview,
  fetchStudioArticles,
  StudioOverview,
  StudioArticleSummary,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PenSquare,
  BookOpen,
  FileText,
  Eye,
  Heart,
  Bookmark,
  MessageSquare,
  Archive,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

export default function StudioOverviewPage() {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<StudioOverview | null>(null);
  const [recentArticles, setRecentArticles] = useState<StudioArticleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!accessToken) return;
      setIsLoading(true);
      const [ovRes, artRes] = await Promise.all([
        fetchStudioOverview(accessToken),
        fetchStudioArticles(accessToken, { page: 1, perPage: 5 }),
      ]);

      if (ovRes.success && ovRes.data?.overview) {
        setOverview(ovRes.data.overview);
      }
      if (artRes.success && artRes.data?.articles) {
        setRecentArticles(artRes.data.articles);
      }
      setIsLoading(false);
    }
    loadData();
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className="py-16 text-center font-mono text-xs text-zinc-500">
        Loading telemetry and drafts...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-8 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900/80 via-zinc-900/40 to-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Developer Creator Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
            Author Studio & Publishing Pipeline
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl font-sans leading-relaxed">
            Draft, preview, publish, and track engagement on your software engineering architecture articles.
          </p>
        </div>

        <Link href="/studio/articles/new">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs px-5 py-2.5 shadow-lg shadow-emerald-950/40">
            <PenSquare className="w-4 h-4" />
            <span>Write New Article</span>
          </Button>
        </Link>
      </div>

      {/* Overview Telemetry Metrics */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Published Articles</span>
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-100">
              {overview.published_count.toLocaleString()}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Active Drafts</span>
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-100">
              {overview.draft_count.toLocaleString()}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Total Readers</span>
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-100">
              {overview.total_views.toLocaleString()}
            </div>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Total Appreciations</span>
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-100">
              {overview.total_likes.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Recent Articles Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-zinc-200">
            Recent Articles & Drafts
          </h2>
          <Link
            href="/studio/articles"
            className="flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <span>View All Articles</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentArticles.length > 0 ? (
          <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/20 overflow-hidden">
            {recentArticles.map((art) => (
              <div
                key={art.id}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={art.status} />
                    <span className="font-mono text-xs text-zinc-500">
                      Updated {new Date(art.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-zinc-100 hover:text-emerald-400 transition-colors">
                    <Link href={`/studio/articles/${art.id}/edit`}>
                      {art.title}
                    </Link>
                  </h3>
                  {art.subtitle && (
                    <p className="text-xs text-zinc-400 line-clamp-1">
                      {art.subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 mr-2">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{art.views_count}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{art.likes_count}</span>
                    </span>
                  </div>

                  <Link href={`/studio/articles/${art.id}/edit`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-800 hover:bg-zinc-800 text-xs font-mono"
                    >
                      Edit
                    </Button>
                  </Link>

                  {art.status === "published" && (
                    <Link href={`/article/${art.slug}`} target="_blank">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-mono text-emerald-400 hover:text-emerald-300"
                      >
                        View Live
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/20 font-mono text-xs text-zinc-500 space-y-3">
            <p>You haven&apos;t written any articles yet.</p>
            <Link href="/studio/articles/new">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1.5 font-mono text-xs">
                <PenSquare className="w-3.5 h-3.5" />
                <span>Create Your First Article</span>
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "published":
      return (
        <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-800 uppercase text-[10px] font-mono">
          Published
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-amber-950/60 text-amber-400 border-amber-800 uppercase text-[10px] font-mono">
          Draft
        </Badge>
      );
    case "archived":
      return (
        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 uppercase text-[10px] font-mono">
          Archived
        </Badge>
      );
    default:
      return null;
  }
}
