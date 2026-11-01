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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  PenSquare,
  Search,
  Eye,
  Heart,
  Bookmark,
  MessageSquare,
  Trash2,
  Archive,
  Globe,
  ExternalLink,
  Edit,
  Clock,
  Sparkles,
  FileText,
} from "lucide-react";

export default function WorkspaceArticlesPage() {
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
    if (!confirm("Are you sure you want to archive this article? It will no longer be visible in public exploration.")) return;
    const res = await archiveStudioArticle(accessToken, id);
    if (res.success) {
      loadArticles();
    } else {
      alert(res.error?.message || "Failed to archive article");
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to permanently delete this draft/article? This action cannot be reversed.")) return;
    const res = await deleteStudioArticle(accessToken, id);
    if (res.success) {
      loadArticles();
    } else {
      alert(res.error?.message || "Failed to delete article");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
            Articles & Content Management
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Publish, edit drafts, review analytics, and manage technical essays.
          </p>
        </div>

        <Link href="/studio/articles/new">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs shadow-sm">
            <PenSquare className="w-4 h-4" />
            <span>Write New Article</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono w-full sm:w-auto">
          {(["all", "published", "draft", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-md capitalize transition-colors ${
                statusFilter === s
                  ? "bg-zinc-800 text-emerald-400 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search your articles..."
            className="pl-9 bg-zinc-900/60 border-zinc-800 text-xs font-mono placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Articles List / Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-zinc-900/40 animate-pulse border border-zinc-800/60" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="p-16 text-center space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20">
          <FileText className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="font-mono font-bold text-sm text-zinc-300">
            No articles found matching "{statusFilter}"
          </h3>
          <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">
            Get started by writing your first engineering essay with Markdown and LaTeX support.
          </p>
          <Link href="/studio/articles/new">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs">
              <PenSquare className="w-3.5 h-3.5 mr-1.5" />
              Start Writing
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((art) => (
            <Card key={art.id} className="bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700/80 transition-colors">
              <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        art.status === "published"
                          ? "default"
                          : art.status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] font-mono capitalize"
                    >
                      {art.status}
                    </Badge>
                    <span className="text-xs font-mono text-zinc-500">
                      Created {new Date(art.created_at).toLocaleDateString()}
                    </span>
                    {art.reading_time_minutes > 0 && (
                      <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {art.reading_time_minutes} min read
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-semibold text-zinc-100 hover:text-emerald-400 transition-colors">
                    <Link href={`/studio/articles/${art.id}/edit`}>
                      {art.title}
                    </Link>
                  </h2>

                  {art.subtitle && (
                    <p className="text-xs text-zinc-400 font-sans line-clamp-1">
                      {art.subtitle}
                    </p>
                  )}

                  {/* Telemetry Pills */}
                  <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                      {art.views_count || 0} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-zinc-500" />
                      {art.likes_count || 0} likes
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                      {art.comments_count || 0} comments
                    </span>
                  </div>
                </div>

                {/* Article Actions */}
                <div className="flex items-center gap-2 shrink-0 font-mono text-xs w-full md:w-auto justify-end border-t md:border-t-0 border-zinc-800/80 pt-3 md:pt-0">
                  {art.status === "published" && (
                    <Link href={`/article/${art.slug}`} target="_blank">
                      <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Live</span>
                      </Button>
                    </Link>
                  )}

                  <Link href={`/studio/articles/${art.id}/edit`}>
                    <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 gap-1.5">
                      <Edit className="w-3.5 h-3.5 text-blue-400" />
                      <span>Edit</span>
                    </Button>
                  </Link>

                  {art.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(art.id)}
                      className="h-8 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
                    >
                      Publish
                    </Button>
                  )}

                  {art.status === "published" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchive(art.id)}
                      className="h-8 text-zinc-400 hover:text-amber-400"
                      title="Archive article"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(art.id)}
                    className="h-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80 text-xs font-mono">
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 border-zinc-800 text-zinc-400"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 border-zinc-800 text-zinc-400"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

