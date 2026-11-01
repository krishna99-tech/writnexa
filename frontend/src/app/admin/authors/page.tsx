"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchAdminUsers, AdminUserSummary } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, ExternalLink, ChevronLeft, ChevronRight, BookOpen, Users } from "lucide-react";

export default function AdminAuthorsPage() {
  const { accessToken } = useAuth();

  const [authors, setAuthors] = useState<AdminUserSummary[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAuthors = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchAdminUsers(accessToken, {
      q: searchQuery,
      role: "author",
      page,
      per_page: 15,
    });
    setIsLoading(false);
    if (res.success && res.data) {
      setAuthors(res.data.users || []);
      setTotalRecords(res.meta?.total_records || 0);
      setTotalPages(res.meta?.total_pages || 1);
    }
  }, [accessToken, searchQuery, page]);

  useEffect(() => {
    loadAuthors();
  }, [loadAuthors]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-sky-400 font-mono text-xs">
          <FileText className="w-4 h-4" />
          <span>authors_registry // publication_creators</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">
          Authors Directory
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Review verified writers, publication creators, and author engagement statistics.
        </p>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search author username, email, or display name..."
            className="pl-9 h-10 bg-zinc-950 border-zinc-800 font-mono text-xs w-full"
          />
        </div>
      </div>

      {/* Authors Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Author</th>
                <th className="py-3 px-4 font-semibold">Headline</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Articles</th>
                <th className="py-3 px-4 font-semibold">Followers</th>
                <th className="py-3 px-4 font-semibold">Joined</th>
                <th className="py-3 px-4 font-semibold text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    Loading authors...
                  </td>
                </tr>
              ) : authors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500 font-mono">
                    No authors found matching criteria.
                  </td>
                </tr>
              ) : (
                authors.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-900/50 transition-colors">
                    {/* Author Identity */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-zinc-200">
                          {a.display_name || a.username || "—"}
                        </div>
                        <div className="text-emerald-400 text-[11px]">
                          @{a.username}
                        </div>
                        <div className="text-zinc-500 text-[10px]">
                          {a.email}
                        </div>
                      </div>
                    </td>

                    {/* Headline */}
                    <td className="py-3.5 px-4 text-zinc-400 max-w-xs truncate font-sans">
                      {a.headline || "—"}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono capitalize ${
                          a.status === "active"
                            ? "border-emerald-800 text-emerald-400 bg-emerald-950/20"
                            : "border-rose-800 text-rose-400 bg-rose-950/20"
                        }`}
                      >
                        {a.status}
                      </Badge>
                    </td>

                    {/* Articles */}
                    <td className="py-3.5 px-4 text-zinc-300">
                      {a.article_count}
                    </td>

                    {/* Followers */}
                    <td className="py-3.5 px-4 text-zinc-300">
                      {a.follower_count}
                    </td>

                    {/* Joined */}
                    <td className="py-3.5 px-4 text-zinc-500">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>

                    {/* Profile Link */}
                    <td className="py-3.5 px-4 text-right">
                      {a.username ? (
                        <Link
                          href={`/author/${a.username}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:underline"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
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
              Total authors: <strong className="text-zinc-200">{totalRecords}</strong>
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
    </div>
  );
}

