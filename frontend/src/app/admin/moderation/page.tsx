"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  fetchAdminReports,
  resolveAdminReport,
  ModerationReportItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function AdminModerationPage() {
  const { accessToken } = useAuth();

  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");
  const [selectedTargetType, setSelectedTargetType] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Resolution modal state
  const [activeReport, setActiveReport] = useState<ModerationReportItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<"action_taken" | "dismissed" | "reviewed">("action_taken");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchAdminReports(accessToken, {
      status: selectedStatus,
      target_type: selectedTargetType,
      page,
      per_page: 15,
    });
    setIsLoading(false);
    if (res.success && res.data) {
      setReports(res.data.reports || []);
      setTotalRecords(res.meta?.total_records || 0);
      setTotalPages(res.meta?.total_pages || 1);
    }
  }, [accessToken, selectedStatus, selectedTargetType, page]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleResolve = async () => {
    if (!accessToken || !activeReport) return;
    setIsSubmitting(true);
    const res = await resolveAdminReport(
      accessToken,
      activeReport.id,
      resolutionStatus,
      resolutionNotes
    );
    setIsSubmitting(false);
    if (res.success) {
      setSuccessMsg(`Report ${activeReport.id} marked as ${resolutionStatus}.`);
      setActiveReport(null);
      setResolutionNotes("");
      loadReports();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-rose-400 font-mono text-xs">
          <AlertTriangle className="w-4 h-4" />
          <span>moderation_queue // trust_and_safety</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">
          Moderation & Flagged Content
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Review community-reported policy violations, spam submissions, and inappropriate commentary.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
      )}

      {/* Filter Chips */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-zinc-500 mr-1">Status:</span>
          {(["pending", "action_taken", "dismissed", ""] as const).map((s) => {
            const active = selectedStatus === s;
            return (
              <Badge
                key={s || "all"}
                variant={active ? "default" : "outline"}
                onClick={() => {
                  setSelectedStatus(s);
                  setPage(1);
                }}
                className={`cursor-pointer font-mono text-xs py-1 capitalize ${
                  active
                    ? "bg-amber-600 text-zinc-950 font-bold"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s || "All"}
              </Badge>
            );
          })}
        </div>

        <select
          value={selectedTargetType}
          onChange={(e) => {
            setSelectedTargetType(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs focus:outline-none"
        >
          <option value="">All Target Types</option>
          <option value="article">Articles</option>
          <option value="comment">Comments</option>
          <option value="user">Users</option>
        </select>
      </div>

      {/* Reports Listing */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 animate-pulse space-y-2"
              >
                <div className="w-32 h-4 rounded bg-zinc-800" />
                <div className="w-full h-8 rounded bg-zinc-800/60" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800 text-zinc-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60" />
            <p className="text-sm font-sans">
              No reports in this queue.
            </p>
            <p className="text-xs font-mono text-zinc-600">
              Platform content is adhering to community guidelines.
            </p>
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="capitalize text-[10px] border-zinc-700 bg-zinc-950 text-amber-400"
                  >
                    Target: {r.target_type}
                  </Badge>
                  <span className="text-zinc-500">
                    Reported by @{r.reporter_username || "anonymous"}
                  </span>
                  <span className="text-zinc-600">&bull;</span>
                  <span className="text-zinc-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono capitalize ${
                      r.status === "pending"
                        ? "border-rose-800 text-rose-400 bg-rose-950/20"
                        : r.status === "action_taken"
                        ? "border-emerald-800 text-emerald-400 bg-emerald-950/20"
                        : "border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {r.status}
                  </Badge>
                  {r.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveReport(r);
                        setResolutionStatus("action_taken");
                        setResolutionNotes("");
                      }}
                      className="h-7 text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>

              {/* Report Reason & Details */}
              <div className="space-y-1 font-sans">
                <h3 className="text-sm font-bold text-zinc-200">
                  {r.reason}
                </h3>
                {r.details && (
                  <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                    {r.details}
                  </p>
                )}
                <div className="text-[11px] font-mono text-zinc-600 pt-1">
                  Target ID: {r.target_id}
                </div>
              </div>

              {/* Resolution details if already resolved */}
              {r.resolved_at && (
                <div className="pt-2 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>
                    Resolved by @{r.resolver_username || "staff"} &bull; {r.resolution_notes || "No notes attached"}
                  </span>
                  <span>
                    {new Date(r.resolved_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-zinc-800 text-xs font-mono text-zinc-400">
          <span>
            Total reports: <strong className="text-zinc-200">{totalRecords}</strong>
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

      {/* Resolution Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Resolve Moderation Report
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  {activeReport.reason}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono text-zinc-400 block">
                Resolution Decision:
              </label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-200"
              >
                <option value="action_taken">Action Taken (Violating content actioned)</option>
                <option value="dismissed">Dismissed (No violation found)</option>
                <option value="reviewed">Reviewed (Acknowledged without penalty)</option>
              </select>

              <label className="text-xs font-mono text-zinc-400 block">
                Staff Resolution Notes:
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the moderation action or justification..."
                rows={3}
                className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-sans text-zinc-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveReport(null)}
                className="font-mono text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleResolve}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono text-xs font-semibold"
              >
                {isSubmitting ? "Saving..." : "Submit Resolution"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

