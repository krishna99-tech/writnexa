"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchAdminArticles,
  toggleAdminFeatureArticle,
  archiveAdminArticle,
  AdminArticleSummary,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Search,
  Star,
  Archive,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  Heart,
} from "lucide-react";

export default function AdminArticlesPage() {
  const { accessToken } = useAuth();

  const [articles, setArticles] = useState<AdminArticleSummary[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Confirm Archive Action
  const [targetArticle, setTargetArticle] = useState<AdminArticleSummary | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadArticles = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchAdminArticles(accessToken, {
      q: searchQuery,
      status: selectedStatus,
      page,
      per_page: 15,
    });
    setIsLoading(false);
    if (res.success && res.data) {
      setArticles(res.data.articles || []);
      setTotalRecords(res.meta?.total_records || 0);
      setTotalPages(res.meta?.total_pages || 1);
    }
  }, [accessToken, searchQuery, selectedStatus, page]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleToggleFeature = async (art: AdminArticleSummary) => {
    if (!accessToken) return;
    const nextFeatured = !art.featured;
    const res = await toggleAdminFeatureArticle(accessToken, art.id, nextFeatured);
    if (res.success) {
      setArticles((prev) =>
        prev.map((a) => (a.id === art.id ? { ...a, featured: nextFeatured } : a))
      );
      setSuccessMsg(
        `Article "${art.title}" ${nextFeatured ? "marked as featured" : "unfeatured"}.`
      );
    }
  };

  const handleArchiveArticle = async () => {
    if (!accessToken || !targetArticle) return;
    setIsArchiving(true);
    const res = await archiveAdminArticle(accessToken, targetArticle.id);
    setIsArchiving(false);
    if (res.success) {
      setArticles((prev) =>
        prev.map((a) => (a.id === targetArticle.id ? { ...a, status: "archived" } : a))
      );
      setSuccessMsg(`Article "${targetArticle.title}" archived for policy violation.`);
      setTargetArticle(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <BookOpen className="w-4 h-4" />
          <span>content_registry // editorial_moderation</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">
          Content & Article Management
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Review published technical articles, manage featured editorial spots, and archive policy-violating content.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search article title or author..."
            className="pl-9 h-10 bg-zinc-950 border-zinc-800 font-mono text-xs w-full"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs focus:outline-none focus:border-zinc-700"
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Articles Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Article</th>
                <th className="py-3 px-4 font-semibold">Author</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Telemetry</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    Loading articles...
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    No articles found matching criteria.
                  </td>
                </tr>
              ) : (
                articles.map((art) => (
                  <tr key={art.id} className="hover:bg-zinc-900/50 transition-colors">
                    {/* Article Title & Slug */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="space-y-0.5">
                        <Link
                          href={`/article/${art.slug}`}
                          target="_blank"
                          className="font-bold text-zinc-200 hover:text-emerald-400 transition-colors line-clamp-1 block"
                        >
                          {art.title}
                        </Link>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                          <span>/{art.slug}</span>
                          {art.featured && (
                            <Badge className="bg-amber-950 text-amber-400 border border-amber-800 text-[9px] py-0">
                              featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Author */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="text-zinc-300 font-semibold">{art.author_display_name}</div>
                        <div className="text-zinc-500 text-[11px]">@{art.author_username}</div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      {art.category_name ? (
                        <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-400">
                          {art.category_name}
                        </Badge>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono capitalize ${
                          art.status === "published"
                            ? "border-emerald-800 text-emerald-400 bg-emerald-950/20"
                            : art.status === "archived"
                            ? "border-rose-800 text-rose-400 bg-rose-950/20"
                            : "border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {art.status}
                      </Badge>
                    </td>

                    {/* Telemetry */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-zinc-500" />
                          {art.views_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" />
                          {art.likes_count}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-zinc-500 text-[11px]">
                      {new Date(art.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Feature Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFeature(art)}
                          className={`h-7 px-2 font-mono text-xs ${
                            art.featured ? "text-amber-400 hover:text-amber-300" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                          title={art.featured ? "Unfeature article" : "Mark as featured"}
                        >
                          <Star className={`w-3.5 h-3.5 ${art.featured ? "fill-amber-400" : ""}`} />
                        </Button>

                        {/* Archive Content */}
                        {art.status !== "archived" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTargetArticle(art)}
                            className="h-7 text-xs font-mono text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                            title="Archive violating article"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Public Link */}
                        <Link href={`/article/${art.slug}`} target="_blank">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-zinc-500 hover:text-zinc-200"
                            title="View live publication"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-zinc-800 text-xs font-mono text-zinc-400">
            <span>
              Total articles: <strong className="text-zinc-200">{totalRecords}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 text-xs font-mono border-zinc-800"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 text-xs font-mono border-zinc-800"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Article Archive */}
      {targetArticle && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Confirm Article Archival
                </h3>
                <p className="text-xs text-zinc-400 font-mono truncate max-w-xs">
                  {targetArticle.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              Archiving this article will immediately take it down from public view, search indexing, and author profiles. An administrative audit log will be created.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTargetArticle(null)}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleArchiveArticle}
                disabled={isArchiving}
                className="bg-rose-600 hover:bg-rose-500 text-zinc-100 font-mono text-xs font-semibold"
              >
                {isArchiving ? "Archiving..." : "Confirm Archive"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

