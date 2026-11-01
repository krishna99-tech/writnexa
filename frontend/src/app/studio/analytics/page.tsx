"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchAuthorAnalytics, AuthorAnalyticsResult } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Heart,
  Bookmark,
  MessageSquare,
  Share2,
  Calendar,
  Sparkles,
  ExternalLink,
  Edit3,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileText,
} from "lucide-react";

export default function StudioAnalyticsPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AuthorAnalyticsResult | null>(null);
  const [selectedRange, setSelectedRange] = useState<string>("30d");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAnalytics = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchAuthorAnalytics(accessToken, { range: selectedRange });
    setIsLoading(false);
    if (res.success && res.data?.analytics) {
      setData(res.data.analytics);
    }
  }, [accessToken, selectedRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <BarChart3 className="w-4 h-4" />
            <span>studio // content_telemetry</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100">
            Author Analytics
          </h1>
          <p className="text-sm text-zinc-400 font-sans">
            Real-time reader engagement, discovery velocity, and per-article telemetry isolated strictly to your published content.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
          {[
            { label: "24h", value: "24h" },
            { label: "7d", value: "7d" },
            { label: "30d", value: "30d" },
            { label: "90d", value: "90d" },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setSelectedRange(r.value)}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                selectedRange === r.value
                  ? "bg-emerald-600 text-zinc-950 font-bold"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30 animate-pulse space-y-3"
            >
              <div className="w-24 h-4 rounded bg-zinc-800" />
              <div className="w-16 h-8 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-8">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Views */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>TOTAL READS / VIEWS</span>
                  <Eye className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {(data.total_views || 0).toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  In {data.range} interval
                </div>
              </CardContent>
            </Card>

            {/* Unique Readers */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>UNIQUE READERS</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {(data.unique_visitors || 0).toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Salted cryptographic visitor hashes
                </div>
              </CardContent>
            </Card>

            {/* Engagement Rate */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>ENGAGEMENT RATE</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {(data.engagement_rate || 0).toFixed(1)}%
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Reactions & feedback per read
                </div>
              </CardContent>
            </Card>

            {/* Community Interactions */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>COMMUNITY FEEDBACK</span>
                  <Heart className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-zinc-100 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm text-rose-400 font-normal">
                    <Heart className="w-3.5 h-3.5 fill-rose-400/20" /> {data.total_likes || 0}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-amber-400 font-normal">
                    <Bookmark className="w-3.5 h-3.5 fill-amber-400/20" /> {data.total_bookmarks || 0}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-cyan-400 font-normal">
                    <MessageSquare className="w-3.5 h-3.5" /> {data.total_comments || 0}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Likes, bookmarks & discussions
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Views Timeseries Activity */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Daily Readership Velocity</span>
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Timeline distribution of raw events and unique visitors over {data.range}.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {(data.timeseries || []).length} days recorded
              </span>
            </div>

            {(!data.timeseries || data.timeseries.length === 0) ? (
              <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                No activity data for this time range yet.
              </p>
            ) : (
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {(data.timeseries || []).slice(-14).map((point) => (
                    <div
                      key={point.date}
                      className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-center space-y-1"
                    >
                      <div className="text-[10px] font-mono text-zinc-500">
                        {new Date(point.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                      <div className="text-base font-bold font-mono text-emerald-400">
                        {point.total_views}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        {point.unique_visitors} readers
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Two-Column Grid: Traffic Sources & Isolation Notice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traffic Acquisition Sources */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-sky-400" />
                  <span>Traffic Sources Breakdown</span>
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Referral channels categorized from incoming HTTP discovery headers.
                </p>
              </div>

              {(!data.traffic_sources || data.traffic_sources.length === 0) ? (
                <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                  No source data recorded yet.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {(data.traffic_sources || []).map((src) => (
                    <div key={src.source} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="capitalize text-zinc-300 font-semibold">{src.source}</span>
                        <span className="text-zinc-400">
                          {(src.count || 0).toLocaleString()} visits ({src.percentage || 0}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(5, src.percentage || 0))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Author Privacy & Verification Guarantee */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Privacy & Deduplication Architecture</span>
                </h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Quorix operates on zero-surveillance analytics principles to preserve both reader privacy and developer trust.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="text-xs font-sans text-zinc-300">
                    <strong className="text-zinc-100 font-mono">Strict Author Isolation:</strong> Metrics shown here are bound strictly to your user identifier from cryptographic JWT claims. Other authors can never inspect your read counts.
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="text-xs font-sans text-zinc-300">
                    <strong className="text-zinc-100 font-mono">Salted Visitor Hashes:</strong> No raw IP addresses are persisted. Views are deduplicated via unique daily compound keys (<code className="text-emerald-400 text-[11px]">article_id + visitor_hash + date</code>).
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="text-xs font-sans text-zinc-300">
                    <strong className="text-zinc-100 font-mono">Real Activity Only:</strong> Synthetic data generation is disabled. Every counter increment represents authentic reader engagement.
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span>Range: {data.start_date?.split("T")[0] ?? ""} to {data.end_date?.split("T")[0] ?? ""}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Live Telemetry
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Per-Article Performance Table */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Article Performance Breakdown</span>
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Granular performance analytics for each technical piece authored by you.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono text-zinc-400 border-zinc-700">
                {(data.articles || []).length} Published Articles
              </Badge>
            </div>

            {(!data.articles || data.articles.length === 0) ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm font-mono text-zinc-500">
                  No published articles found for your author profile.
                </p>
                <Link href="/studio/articles/new">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs">
                    Write First Article
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-sans border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Article Title</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Read Time</th>
                      <th className="py-3 px-4 text-right">Views</th>
                      <th className="py-3 px-4 text-right">Unique Readers</th>
                      <th className="py-3 px-4 text-right">Likes</th>
                      <th className="py-3 px-4 text-right">Bookmarks</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                    {(data.articles || []).map((art) => (
                      <tr key={art.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-200 line-clamp-1">
                            <Link
                              href={`/article/${art.slug}`}
                              className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                            >
                              <span>{art.title}</span>
                              <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0" />
                            </Link>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {art.published_at ? new Date(art.published_at).toLocaleDateString() : "Draft"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                              art.status === "published"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : art.status === "archived"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}
                          >
                            {art.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {art.reading_time_minutes || 1} min
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-zinc-100">
                          {(art.views_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-sky-400">
                          {(art.unique_visitors || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-400">
                          {(art.likes_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-amber-400">
                          {(art.bookmarks_count || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link href={`/studio/articles/${art.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1" />
                              Edit
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-zinc-500 font-mono">
          Failed to load author analytics. Please try refreshing.
        </div>
      )}
    </div>
  );
}

