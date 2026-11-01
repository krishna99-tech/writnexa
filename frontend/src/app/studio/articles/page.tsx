"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchStudioArticles,
  publishStudioArticle,
  archiveStudioArticle,
  deleteStudioArticle,
  StudioArticleSummary,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PenSquare,
  Search,
  Eye,
  Heart,
  Bookmark,
  MessageSquare,
  MoreVertical,
  Trash2,
  Archive,
  Globe,
  ExternalLink,
  Edit,
  Clock,
  Sparkles,
} from "lucide-react";

export default function StudioArticlesPage() {
  const { accessToken } = useAuth();
  const [articles, setArticles] = useState<StudioArticleSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadArticles = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchStudioArticles(accessToken, {
      status: statusFilter,
      search: searchQuery,
      page,
      perPage: 12,
    });
    if (res.success && res.data?.articles) {
      setArticles(res.data.articles);
      if (res.meta?.total_pages) {
        setTotalPages(res.meta.total_pages);
      }
    }
    setIsLoading(false);
  }, [accessToken, statusFilter, searchQuery, page]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handlePublish = async (id: string) => {
    if (!accessToken) return;
    const res = await publishStudioArticle(accessToken, id);
    if (res.success) {
      loadArticles();
    } else {
      alert(res.error?.message || "Failed to publish article");
    }
  };

  const handleArchive = async (id: string) => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to archive this article? It will no longer be visible in the public explorer.")) return;
    const res = await archiveStudioArticle(accessToken, id);
    if (res.success) {
      loadArticles();
    } else {
      alert(res.error?.message || "Failed to archive article");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!accessToken) return;
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    const res = await deleteStudioArticle(accessToken, id);
    if (res.success) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert(res.error?.message || "Failed to delete article");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Article Management
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Manage your drafts, publish new releases, and organize technical publications.
          </p>
        </div>

        <Link href="/studio/articles/new">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs">
            <PenSquare className="w-4 h-4" />
            <span>New Article</span>
          </Button>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-1">
          {(["all", "published", "draft", "archived"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-mono rounded-md uppercase tracking-wider transition-all ${
                statusFilter === tab
                  ? "bg-zinc-800 text-emerald-400 font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title..."
            className="pl-9 h-9 text-xs font-mono"
          />
        </div>
      </div>

      {/* Article Cards Grid / List */}
      {isLoading ? (
        <div className="py-20 text-center font-mono text-xs text-zinc-500">
          Loading articles...
        </div>
      ) : articles.length > 0 ? (
        <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-900/20 overflow-hidden shadow-lg">
          {articles.map((art) => (
            <div
              key={art.id}
              className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-zinc-900/40 transition-colors"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusBadge status={art.status} />
                  {art.category_name && (
                    <Badge variant="outline" className="border-zinc-800 text-[10px] font-mono text-zinc-400">
                      {art.category_name}
                    </Badge>
                  )}
                  <span className="font-mono text-xs text-zinc-500">
                    Updated {new Date(art.updated_at).toLocaleDateString()}
                  </span>
                  {art.reading_time_minutes && (
                    <span className="font-mono text-xs text-zinc-500">
                      • {art.reading_time_minutes} min read
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-zinc-100 hover:text-emerald-400 transition-colors">
                  <Link href={`/studio/articles/${art.id}/edit`}>
                    {art.title}
                  </Link>
                </h2>

                {art.subtitle && (
                  <p className="text-sm text-zinc-400 font-sans line-clamp-1">
                    {art.subtitle}
                  </p>
                )}

                {art.tags && art.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {art.tags.map((t) => (
                      <span
                        key={t.slug || t.name}
                        className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Telemetry & Direct Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                {art.status === "published" && (
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 mr-2">
                    <span className="flex items-center gap-1" title="Views">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>{art.views_count}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Likes">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>{art.likes_count}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Comments">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{art.comments_count}</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Link href={`/studio/articles/${art.id}/edit`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-800 hover:bg-zinc-800 text-xs font-mono gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </Button>
                  </Link>

                  {art.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(art.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs font-mono"
                    >
                      Publish
                    </Button>
                  )}

                  {art.status === "published" && (
                    <>
                      <Link href={`/article/${art.slug}`} target="_blank">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-mono text-emerald-400 hover:text-emerald-300 gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(art.id)}
                        className="text-xs font-mono text-zinc-400 hover:text-zinc-200"
                        title="Archive article"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}

                  {art.status === "archived" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(art.id)}
                      className="border border-zinc-700 hover:border-emerald-500 text-xs font-mono text-zinc-300 hover:text-emerald-400"
                    >
                      Republish
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(art.id, art.title)}
                    className="text-xs font-mono text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                    title="Delete article"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center rounded-xl border border-zinc-800 bg-zinc-900/20 font-mono text-xs text-zinc-500 space-y-3">
          <p>No articles found for filter &quot;{statusFilter}&quot;.</p>
          <Link href="/studio/articles/new">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1.5 font-mono text-xs">
              <PenSquare className="w-3.5 h-3.5" />
              <span>Create Article</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border-zinc-800 font-mono text-xs"
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="border-zinc-800 font-mono text-xs"
          >
            Next
          </Button>
        </div>
      )}
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
