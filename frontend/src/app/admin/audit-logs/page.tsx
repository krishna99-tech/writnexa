"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchAdminAuditLogs, AuditLogItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Shield, ChevronLeft, ChevronRight, Terminal } from "lucide-react";

export default function AdminAuditLogsPage() {
  const { accessToken } = useAuth();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedTargetType, setSelectedTargetType] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadLogs = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchAdminAuditLogs(accessToken, {
      action: selectedAction,
      target_type: selectedTargetType,
      page,
      per_page: 25,
    });
    setIsLoading(false);
    if (res.success && res.data) {
      setLogs(res.data.logs || []);
      setTotalRecords(res.meta?.total_records || 0);
      setTotalPages(res.meta?.total_pages || 1);
    }
  }, [accessToken, selectedAction, selectedTargetType, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-purple-400 font-mono text-xs">
          <History className="w-4 h-4" />
          <span>security_telemetry // administrative_audit_trail</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">
          Administrative Audit Logs
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Immutable audit trail tracking all administrative operations, permission changes, and content interventions.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="user.status_suspended">User Suspension</option>
            <option value="user.status_active">User Reactivation</option>
            <option value="user.role_change">Role Change</option>
            <option value="article.feature">Feature Article</option>
            <option value="article.unfeature">Unfeature Article</option>
            <option value="article.archive">Archive Article</option>
            <option value="report.action_taken">Report Actioned</option>
            <option value="setting.update">Settings Update</option>
          </select>

          <select
            value={selectedTargetType}
            onChange={(e) => {
              setSelectedTargetType(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs focus:outline-none"
          >
            <option value="">All Target Types</option>
            <option value="user">User</option>
            <option value="article">Article</option>
            <option value="moderation_report">Moderation Report</option>
            <option value="platform_settings">Platform Settings</option>
          </select>
        </div>

        <div className="text-xs font-mono text-zinc-500">
          Showing 25 events per page
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs font-mono">
            <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Target</th>
                <th className="py-3 px-4 font-semibold">Details</th>
                <th className="py-3 px-4 font-semibold">IP Address</th>
                <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500 font-mono">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500 font-mono">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-900/50 transition-colors">
                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="text-zinc-200 font-semibold">
                          {log.actor_display_name || log.actor_username || log.actor_email}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                          <span>{log.actor_email}</span>
                          <Badge variant="outline" className="text-[9px] py-0 border-zinc-700 capitalize">
                            {log.actor_role}
                          </Badge>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <Badge className="bg-zinc-950 border border-zinc-700 text-emerald-400 text-[10px] font-mono">
                        {log.action}
                      </Badge>
                    </td>

                    {/* Target */}
                    <td className="py-3.5 px-4 text-zinc-300">
                      <div className="space-y-0.5">
                        <span className="capitalize text-zinc-400">{log.target_type}</span>
                        {log.target_id && (
                          <div className="text-[10px] text-zinc-600 font-mono truncate max-w-[140px]">
                            {log.target_id}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Details Payload */}
                    <td className="py-3.5 px-4 max-w-xs truncate text-zinc-400 font-mono text-[11px]">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </td>

                    {/* IP */}
                    <td className="py-3.5 px-4 text-zinc-500">
                      {log.ip_address || "127.0.0.1"}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-right text-zinc-500">
                      {new Date(log.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
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
              Total records: <strong className="text-zinc-200">{totalRecords}</strong>
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

