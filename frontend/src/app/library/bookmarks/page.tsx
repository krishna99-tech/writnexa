"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchBookmarks, toggleBookmark, BookmarkedArticle } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Button } from "@/components/ui/button";
import { Bookmark, Clock, ArrowLeft, Trash2, BookOpen, Compass } from "lucide-react";

export default function BookmarksPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [bookmarks, setBookmarks] = useState<BookmarkedArticle[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadBookmarks = useCallback(
    async (p: number) => {
      if (!accessToken) return;
      setIsLoading(true);
      const res = await fetchBookmarks(accessToken, p, 10);
      setIsLoading(false);
      if (res.success && res.data) {
        setBookmarks(res.data.bookmarks || []);
        if (res.meta?.total_records !== undefined) {
          setTotalRecords(res.meta.total_records);
        } else {
          setTotalRecords(res.data.bookmarks?.length || 0);
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?return_to=/library/bookmarks");
      return;
    }
    if (accessToken) {
      loadBookmarks(page);
    }
  }, [authLoading, user, accessToken, page, loadBookmarks, router]);

  const handleRemoveBookmark = async (articleId: string) => {
    if (!accessToken) return;
    const res = await toggleBookmark(accessToken, articleId);
    if (res.success) {
      setBookmarks((prev) => prev.filter((b) => b.id !== articleId));
      setTotalRecords((prev) => Math.max(0, prev - 1));
    }
  };

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
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Explorer</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
            <Bookmark className="w-4 h-4 fill-amber-400" />
            <span>reading_list // bookmarks_library</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100">
            Saved Bookmarks
          </h1>
          <p className="text-sm text-zinc-400 font-sans">
            Articles and engineering deep dives you have saved for offline study and reference.
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
          Total Saved: <strong className="text-zinc-200">{totalRecords}</strong>
        </div>
      </div>

      {/* Bookmarks Listing */}
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
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-200">
              No bookmarked articles yet
            </h3>
            <p className="text-sm text-zinc-500 font-sans max-w-sm mx-auto">
              Save insightful technical articles while exploring to build your personal knowledge base.
            </p>
          </div>
          <Link href="/explore">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1.5 font-mono text-xs">
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Publications</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="group p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                    <Link
                      href={`/author/${b.author.username}`}
                      className="text-zinc-400 hover:text-emerald-400 font-sans font-medium"
                    >
                      {b.author.display_name}
                    </Link>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {b.reading_time_minutes} min read
                    </span>
                    <span>&bull;</span>
                    <span className="text-amber-500/80">
                      Saved {new Date(b.bookmarked_at).toLocaleDateString()}
                    </span>
                  </div>

                  <Link href={`/article/${b.slug}`}>
                    <h2 className="text-lg font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                      {b.title}
                    </h2>
                  </Link>

                  {b.subtitle && (
                    <p className="text-xs text-zinc-400 line-clamp-2 font-sans">
                      {b.subtitle}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBookmark(b.id)}
                  className="text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 font-mono text-xs shrink-0"
                  title="Remove from bookmarks"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Remove</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

