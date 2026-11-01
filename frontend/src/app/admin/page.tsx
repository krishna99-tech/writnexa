"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchAdminDashboard, AdminDashboardStats } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  BookOpen,
  FileEdit,
  Archive,
  MessageSquare,
  Eye,
  Activity,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Shield,
  Clock,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchAdminDashboard(accessToken);
    setIsLoading(false);
    if (res.success && res.data?.stats) {
      setStats(res.data.stats);
    }
  }, [accessToken]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
            <Shield className="w-4 h-4" />
            <span>system_operations // executive_telemetry</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100">
            System Dashboard
          </h1>
          <p className="text-sm text-zinc-400 font-sans">
            Real-time platform activity, user growth metrics, and moderation telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            className="border-zinc-800 font-mono text-xs"
          >
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30 animate-pulse space-y-3"
            >
              <div className="w-20 h-4 rounded bg-zinc-800" />
              <div className="w-16 h-8 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Users */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>TOTAL USERS</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {stats.total_users.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  +{stats.new_registrations_7d} last 7d &bull; +{stats.new_registrations_30d} last 30d
                </div>
              </CardContent>
            </Card>

            {/* Total Authors */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>TOTAL AUTHORS</span>
                  <UserPlus className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {stats.total_authors.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Registered publication creators
                </div>
              </CardContent>
            </Card>

            {/* Published Articles */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>PUBLISHED ARTICLES</span>
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {stats.published_articles.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  {stats.draft_articles} drafts &bull; {stats.archived_articles} archived
                </div>
              </CardContent>
            </Card>

            {/* Total Page Views */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>TOTAL PAGE VIEWS</span>
                  <Eye className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {stats.total_views.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Accumulated article reads
                </div>
              </CardContent>
            </Card>

            {/* Daily Active Users */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>DAILY ACTIVE USERS</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {stats.daily_active_users.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Active within last 24h
                </div>
              </CardContent>
            </Card>

            {/* Monthly Active Users */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>MONTHLY ACTIVE USERS</span>
                  <Calendar className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {stats.monthly_active_users.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Active in past 30 days
                </div>
              </CardContent>
            </Card>

            {/* Total Comments */}
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>TOTAL COMMENTS</span>
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-bold font-mono text-zinc-100">
                  {stats.total_comments.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  Active technical discussions
                </div>
              </CardContent>
            </Card>

            {/* Pending Reports */}
            <Card className={`border-zinc-800 ${stats.pending_reports > 0 ? "bg-rose-950/20 border-rose-800/60" : "bg-zinc-900/40"}`}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
                  <span>PENDING REPORTS</span>
                  <AlertTriangle className={`w-4 h-4 ${stats.pending_reports > 0 ? "text-rose-400" : "text-zinc-500"}`} />
                </div>
                <div className={`text-3xl font-bold font-mono ${stats.pending_reports > 0 ? "text-rose-400" : "text-zinc-100"}`}>
                  {stats.pending_reports.toLocaleString()}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  {stats.pending_reports > 0 ? "Moderation action needed" : "Queue is clean"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <Link
              href="/admin/users"
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  Manage Users & Roles
                </h3>
                <p className="text-xs text-zinc-500 font-sans">
                  Suspend accounts, review sessions, and manage roles.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </Link>

            <Link
              href="/admin/articles"
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  Content Management
                </h3>
                <p className="text-xs text-zinc-500 font-sans">
                  Feature articles, archive violating publications, and review drafts.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </Link>

            <Link
              href="/admin/moderation"
              className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 transition-colors group flex items-center justify-between"
            >
              <div>
                <h3 className="text-sm font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  Moderation Queue
                </h3>
                <p className="text-xs text-zinc-500 font-sans">
                  Review reported comments, articles, and user behavior.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

