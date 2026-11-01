"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchPlatformAnalytics, PlatformAnalyticsResult } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  BookOpen,
  UserPlus,
  Share2,
  Calendar,
  Layers,
  ExternalLink,
  Shield,
  Activity,
  Heart,
  MessageSquare,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<PlatformAnalyticsResult | null>(null);
  const [selectedRange, setSelectedRange] = useState<string>("30d");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAnalytics = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchPlatformAnalytics(accessToken, { range: selectedRange });
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
            <span>executive_intelligence // platform_analytics</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100">
            Platform Analytics
          </h1>
          <p className="text-sm text-zinc-400 font-sans">
            Aggregate telemetry, unique visitor tracking, traffic acquisition channels, and topic consumption.
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
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Page Views */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>TOTAL PAGE VIEWS</span>
                  <Eye className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {data.total_page_views.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Across all public & studio routes
                </div>
              </CardContent>
            </Card>

            {/* Article Reads */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>ARTICLE READS</span>
                  <BookOpen className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {data.total_article_views.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Technical publications read
                </div>
              </CardContent>
            </Card>

            {/* Unique Visitors */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>UNIQUE VISITORS</span>
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {data.unique_visitors.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  De-duplicated privacy hashes
                </div>
              </CardContent>
            </Card>

            {/* User Registrations */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>NEW REGISTRATIONS</span>
                  <UserPlus className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {data.new_registrations.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  In selected {data.range} period
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
                  <span>Daily Traffic Velocity</span>
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Timeline distribution of raw events and unique visitors over {data.range}.
                </p>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {data.timeseries.length} days recorded
              </span>
            </div>

            {data.timeseries.length === 0 ? (
              <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                No activity data for this time range yet.
              </p>
            ) : (
              <div className="space-y-2 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {data.timeseries.slice(-14).map((point) => (
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
                        {point.unique_visitors} visitors
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Two-Column Grid: Traffic Sources & Top Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traffic Acquisition Sources */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-sky-400" />
                  <span>Traffic Sources Breakdown</span>
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Referral channels categorized from HTTP discovery metadata.
                </p>
              </div>

              {data.traffic_sources.length === 0 ? (
                <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                  No source data recorded yet.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {data.traffic_sources.map((src) => (
                    <div key={src.source} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="capitalize text-zinc-300 font-semibold">{src.source}</span>
                        <span className="text-zinc-400">
                          {src.count.toLocaleString()} visits ({src.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(5, src.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Topics / Categories */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Top Categories by Readership</span>
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Most engaged architectural domains and engineering topics.
                </p>
              </div>

              {data.top_categories.length === 0 ? (
                <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                  No category reads recorded in this interval.
                </p>
              ) : (
                <div className="space-y-2 pt-2">
                  {data.top_categories.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <span className="text-zinc-200 font-semibold">{c.name}</span>
                        <span className="text-zinc-500 text-[10px] block">/{c.slug}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold">{c.views_count} views</span>
                        <span className="text-zinc-500 text-[10px] block">{c.articles_count} articles</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Performing Publications Table */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Top Publications in Period</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Highest read engineering articles ranked by validated reader counts.
              </p>
            </div>

            {data.top_articles.length === 0 ? (
              <p className="text-xs font-mono text-zinc-500 py-6 text-center">
                No article reads recorded in this window.
              </p>
            ) : (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Article</th>
                      <th className="py-3 px-4 font-semibold">Author</th>
                      <th className="py-3 px-4 font-semibold text-right">Views</th>
                      <th className="py-3 px-4 font-semibold text-right">Unique Readers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {data.top_articles.map((art) => (
                      <tr key={art.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/article/${art.slug}`}
                            target="_blank"
                            className="font-semibold text-zinc-200 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                          >
                            <span>{art.title}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-500" />
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          @{art.author_username}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {art.views_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">
                          {art.unique_visitors.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

