"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  fetchSystemHealth,
  fetchFailedJobs,
  retryFailedJob,
  retryAllFailedJobs,
  SystemHealthOverview,
  FailedJobItem,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Server,
  Database,
  Cpu,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  HardDrive,
  Mail,
  Zap,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Radio,
  FileText,
} from "lucide-react";

export default function AdminOperationsPage() {
  const { accessToken } = useAuth();
  const [health, setHealth] = useState<SystemHealthOverview | null>(null);
  const [failedJobs, setFailedJobs] = useState<FailedJobItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"infrastructure" | "storage" | "workers" | "latency">("infrastructure");

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    const [healthRes, jobsRes] = await Promise.all([
      fetchSystemHealth(accessToken),
      fetchFailedJobs(accessToken, { limit: 25 }),
    ]);

    setIsLoading(false);

    if (healthRes.success && healthRes.data?.health) {
      setHealth(healthRes.data.health);
    }
    if (jobsRes.success && jobsRes.data?.failed_jobs) {
      setFailedJobs(jobsRes.data.failed_jobs);
    }
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh interval (every 15 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const handleRetryJob = async (id: string) => {
    if (!accessToken) return;
    setIsRetrying(true);
    const res = await retryFailedJob(accessToken, id);
    setIsRetrying(false);
    if (res.success) {
      setFailedJobs((prev) => prev.filter((j) => j.id !== id));
      loadData();
    }
  };

  const handleRetryAll = async () => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to requeue all failed background tasks for immediate retry?")) return;
    setIsRetrying(true);
    const res = await retryAllFailedJobs(accessToken);
    setIsRetrying(false);
    if (res.success) {
      setFailedJobs([]);
      loadData();
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Activity className="w-4 h-4" />
            <span>executive_intelligence // platform_operations</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100">
            System Operations & Health
          </h1>
          <p className="text-sm text-zinc-400 font-sans">
            Real-time infrastructure telemetry, database connection pools, background worker queues, API latency, and recovery controls.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-mono text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
            />
            <span>Auto-Refresh (15s)</span>
          </label>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-mono text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Top Vital Signs Status Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Overall Platform Health */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>SYSTEM STATUS</span>
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  health?.overall_status === "healthy"
                    ? "bg-emerald-500"
                    : health?.overall_status === "degraded"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-xl font-bold font-mono uppercase text-zinc-100">
                {health?.overall_status || "Initializing"}
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Liveness & Readiness probe active
            </div>
          </CardContent>
        </Card>

        {/* Process Uptime */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>GO PROCESS UPTIME</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {health ? formatUptime(health.runtime.uptime_seconds) : "..."}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Go {health?.runtime.go_version || "1.23+"} ({health?.runtime.num_cpu || 4} CPUs)
            </div>
          </CardContent>
        </Card>

        {/* Memory Footprint */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>MEMORY ALLOCATED</span>
              <Cpu className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {health?.runtime.alloc_mb.toFixed(1) || "0.0"} MB
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Sys: {health?.runtime.sys_mb.toFixed(1) || "0.0"} MB &bull; GCs: {health?.runtime.num_gc || 0}
            </div>
          </CardContent>
        </Card>

        {/* PostgreSQL 16 Pool */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>POSTGRESQL POOL</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-100">
              {health?.database.acquired_conns || 0} / {health?.database.total_conns || 0}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Ping Latency: {health?.database.ping_latency_ms.toFixed(1) || "0.0"} ms
            </div>
          </CardContent>
        </Card>

        {/* API Error Rate & Latency */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>API ERROR RATE (5XX)</span>
              <Zap className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              {health?.api_telemetry.error_rate_percent.toFixed(2) || "0.00"}%
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              p95: {health?.api_telemetry.p95_latency_ms.toFixed(1) || "0.0"} ms &bull; p50: {health?.api_telemetry.p50_latency_ms.toFixed(1) || "0.0"} ms
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab("infrastructure")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "infrastructure"
              ? "bg-zinc-800 text-emerald-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          Subsystems Status
        </button>

        <button
          onClick={() => setActiveTab("storage")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "storage"
              ? "bg-zinc-800 text-emerald-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          Storage & Table Sizes ({health?.database.database_size || "..."})
        </button>

        <button
          onClick={() => setActiveTab("workers")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "workers"
              ? "bg-zinc-800 text-emerald-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          Background Workers & Recovery ({failedJobs.length} Failed)
        </button>

        <button
          onClick={() => setActiveTab("latency")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "latency"
              ? "bg-zinc-800 text-emerald-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          API Telemetry & Latency
        </button>
      </div>

      {/* Tab 1: Subsystems Status */}
      {activeTab === "infrastructure" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Go API Runtime */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-zinc-100">Go API Engine</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                Operational
              </Badge>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Version:</span>
                <span className="text-zinc-200">{health?.runtime.go_version}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Platform:</span>
                <span className="text-zinc-200">{health?.runtime.os}/{health?.runtime.arch}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Goroutines:</span>
                <span className="text-emerald-400 font-bold">{health?.runtime.num_goroutines}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>CPU Cores:</span>
                <span className="text-zinc-200">{health?.runtime.num_cpu}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Heap Allocated:</span>
                <span className="text-zinc-200">{health?.runtime.heap_alloc_mb.toFixed(1)} MB</span>
              </div>
            </div>
          </div>

          {/* PostgreSQL 16 */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-sm text-zinc-100">PostgreSQL 16 Cluster</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-sky-500/30 text-sky-400 bg-sky-500/10 uppercase">
                {health?.database.status || "connected"}
              </Badge>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Ping Latency:</span>
                <span className="text-emerald-400 font-bold">{health?.database.ping_latency_ms.toFixed(2)} ms</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Total Connections:</span>
                <span className="text-zinc-200">{health?.database.total_conns} / {health?.database.max_conns} max</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Active / Idle:</span>
                <span className="text-zinc-200">{health?.database.acquired_conns} active &bull; {health?.database.idle_conns} idle</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Total DB Disk Size:</span>
                <span className="text-sky-300 font-bold">{health?.database.database_size}</span>
              </div>
            </div>
          </div>

          {/* Redis 7 */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-sm text-zinc-100">Redis 7 Cache</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-300 uppercase">
                {health?.redis.status}
              </Badge>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Enabled:</span>
                <span className="text-zinc-200">{health?.redis.enabled ? "Yes" : "Disabled (Memory Fallback)"}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Latency:</span>
                <span className="text-zinc-200">{health?.redis.ping_latency_ms ? `${health.redis.ping_latency_ms.toFixed(2)} ms` : "N/A"}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Cache Tier:</span>
                <span className="text-zinc-400">In-Memory Read Accelerator</span>
              </div>
            </div>
          </div>

          {/* Amazon SES & Outbox Worker */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-zinc-100">SES Email Worker</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 uppercase">
                {health?.workers.worker_status}
              </Badge>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Delivery Mode:</span>
                <span className="text-amber-400 uppercase">{health?.workers.ses_mode}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Pending Outbox:</span>
                <span className="text-zinc-200">{health?.workers.pending}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Sent / Delivered:</span>
                <span className="text-emerald-400 font-bold">{health?.workers.sent}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Failed Tasks:</span>
                <span className={health?.workers.failed ? "text-rose-400 font-bold" : "text-zinc-400"}>
                  {health?.workers.failed}
                </span>
              </div>
            </div>
          </div>

          {/* Storage & Media Storage */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-zinc-100">Media & Content Storage</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-400 bg-purple-500/10 uppercase">
                {health?.storage.status}
              </Badge>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Provider:</span>
                <span className="text-zinc-200">{health?.storage.provider}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Bucket:</span>
                <span className="text-zinc-200">{health?.storage.bucket || "local_filesystem"}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Region:</span>
                <span className="text-zinc-400">{health?.storage.region || "local"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Storage & Table Sizes */}
      {activeTab === "storage" && (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" />
                <span>PostgreSQL 16 Table Storage Breakdown</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Real disk space consumed by tables, indexes, and TOAST storage in the production database.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono border-sky-500/40 text-sky-400">
              Total Database: {health?.database.database_size}
            </Badge>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Relation Name</th>
                  <th className="py-3 px-4 text-right">Row Estimate</th>
                  <th className="py-3 px-4 text-right">Total Disk Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                {health?.database.top_table_sizes?.map((t) => (
                  <tr key={t.table_name} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-200">
                      {t.table_name}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400">
                      {t.row_estimate >= 0 ? t.row_estimate.toLocaleString() : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {t.total_size}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Background Workers & Recovery */}
      {activeTab === "workers" && (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Failed Background Tasks & Recovery Queue</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Inspect failed email outbox jobs, examine network stack exceptions, and trigger immediate task recovery.
              </p>
            </div>

            {failedJobs.length > 0 && (
              <Button
                size="sm"
                onClick={handleRetryAll}
                disabled={isRetrying}
                className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold font-mono text-xs gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                <span>Retry All Failed Tasks ({failedJobs.length})</span>
              </Button>
            )}
          </div>

          {failedJobs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-mono text-zinc-300 font-semibold">
                No Failed Background Tasks
              </p>
              <p className="text-xs font-mono text-zinc-500">
                All scheduled email dispatches and worker routines have completed successfully.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Template & Subject</th>
                    <th className="py-3 px-4">Retries</th>
                    <th className="py-3 px-4">Last Error</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                  {failedJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-200">
                        {j.recipient_email}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-zinc-300 font-sans">{j.subject}</div>
                        <div className="text-[10px] text-zinc-500 font-mono uppercase">{j.template_name}</div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {j.retry_count} / {j.max_retries}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-rose-400 font-mono text-[11px]">
                        {j.last_error || "Unknown Error"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRetrying}
                          onClick={() => handleRetryJob(j.id)}
                          className="h-7 px-3 text-xs font-mono border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Retry
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: API Telemetry & Latency */}
      {activeTab === "latency" && (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>HTTP Traffic Latency Distribution</span>
            </h3>
            <p className="text-xs text-zinc-400 font-sans">
              Computed in real-time across recent incoming API requests using sliding ring buffer sampling.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="text-xs font-mono text-zinc-500">AVERAGE LATENCY</div>
              <div className="text-2xl font-bold font-mono text-zinc-100">
                {health?.api_telemetry.avg_latency_ms.toFixed(2) || "0.00"} ms
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="text-xs font-mono text-zinc-500">MEDIAN (P50)</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">
                {health?.api_telemetry.p50_latency_ms.toFixed(2) || "0.00"} ms
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="text-xs font-mono text-zinc-500">95TH PERCENTILE (P95)</div>
              <div className="text-2xl font-bold font-mono text-sky-400">
                {health?.api_telemetry.p95_latency_ms.toFixed(2) || "0.00"} ms
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <div className="text-xs font-mono text-zinc-500">99TH PERCENTILE (P99)</div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {health?.api_telemetry.p99_latency_ms.toFixed(2) || "0.00"} ms
              </div>
            </div>
          </div>

          {/* Status Breakdown Bar */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Status Codes Distribution</span>
              <span className="text-zinc-400">Total: {health?.api_telemetry.total_requests.toLocaleString() || 0} requests</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <div className="font-bold">{health?.api_telemetry.status_2xx || 0}</div>
                <div className="text-[10px] text-zinc-400">2xx Success</div>
              </div>
              <div className="p-2 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <div className="font-bold">{health?.api_telemetry.status_3xx || 0}</div>
                <div className="text-[10px] text-zinc-400">3xx Redirect</div>
              </div>
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <div className="font-bold">{health?.api_telemetry.status_4xx || 0}</div>
                <div className="text-[10px] text-zinc-400">4xx Client Err</div>
              </div>
              <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <div className="font-bold">{health?.api_telemetry.status_5xx || 0}</div>
                <div className="text-[10px] text-zinc-400">5xx Server Err</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
