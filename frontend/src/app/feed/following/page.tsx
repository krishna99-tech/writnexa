"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchFollowingFeed, ArticleSummary } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft, Compass, Rss, ChevronLeft, ChevronRight } from "lucide-react";

export default function FollowingFeedPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadFeed = useCallback(
    async (p: number) => {
      if (!accessToken) return;
      setIsLoading(true);
      const res = await fetchFollowingFeed(accessToken, p, 10);
      setIsLoading(false);
      if (res.success && res.data) {
        setArticles(res.data.articles || []);
        if (res.meta?.total_records !== undefined) {
          setTotalRecords(res.meta.total_records);
          setTotalPages(res.meta.total_pages || 1);
        } else {
          setTotalRecords(res.data.articles?.length || 0);
          setTotalPages(1);
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?return_to=/feed/following");
      return;
    }
    if (accessToken) {
      loadFeed(page);
    }
  }, [authLoading, user, accessToken, page, loadFeed, router]);

  if (authLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-16 space-y-4">
        <div className="w-48 h-8 rounded bg-zinc-900 animate-pulse" />
        <div className="w-full h-40 rounded bg-zinc-900/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Explorer</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/explore">
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
            >
              Public Feed
            </Button>
          </Link>
          <Button
            size="sm"
            className="font-mono text-xs bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
          >
            Following Feed
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Rss className="w-4 h-4" />
          <span>community_stream // followed_authors</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">
          Your Following Feed
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Fresh articles and updates curated exclusively from engineers and publications you follow.
        </p>
      </div>

      {/* Feed Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 animate-pulse space-y-3"
            >
              <div className="w-3/4 h-6 rounded bg-zinc-800" />
              <div className="w-full h-4 rounded bg-zinc-800/60" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-200">
              No publications in your feed
            </h3>
            <p className="text-sm text-zinc-500 font-sans max-w-sm mx-auto">
              Follow authors and system architects to stay up to date whenever they publish new insights.
            </p>
          </div>
          <Link href="/authors">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1.5 font-mono text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>Discover Authors</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {articles.map((art) => (
              <ArticleCard key={art.id} article={art} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="border-zinc-800 font-mono text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-mono text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-zinc-800 font-mono text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

