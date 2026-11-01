"use client";

import { useEffect, useState } from "react";
import { Terminal, Database, Server, Cpu, CheckCircle2, AlertTriangle, RefreshCw, Layers, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { fetchHealth, type HealthCheckData } from "@/lib/api";

export default function HomePage() {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkBackend = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchHealth();
      if (res.success && res.data) {
        setHealth(res.data);
      } else {
        setErrorMsg(res.error?.message || "Failed to reach Go backend API.");
        setHealth(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-12">
      {/* Hero Section */}
      <section className="space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>QUORIX FOUNDATION v1.0 • PHASE 1 DEPLOYED</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100 max-w-4xl">
          The engineering publishing ecosystem for{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 font-mono">
            modern builders.
          </span>
        </h1>

        <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Not a generic blogging tool. QUORIX is purpose-engineered with a Go 1.26 modular monolith backend, Next.js 15 App Router, and PostgreSQL 16 for high-speed technical knowledge sharing.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button variant="default" className="font-mono text-xs gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-semibold h-10 px-5">
            <span>Explore Architecture</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            className="font-mono text-xs gap-2 border-zinc-700 hover:bg-zinc-900 h-10"
            onClick={checkBackend}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Ping Backend API</span>
          </Button>
        </div>
      </section>

      {/* Live System Health Widget */}
      <section className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-6 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-zinc-200">System Telemetry & Health Probe</h2>
              <p className="text-xs text-zinc-400 font-mono">Verifying live communication: Next.js Frontend ↔ Go Backend (:8080)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {loading ? (
              <Badge variant="outline" className="font-mono animate-pulse">
                Probing...
              </Badge>
            ) : health?.status === "healthy" ? (
              <Badge variant="success" className="font-mono gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ONLINE (HEALTHY)</span>
              </Badge>
            ) : (
              <Badge variant="warning" className="font-mono gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>ONLINE (DEGRADED)</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Engine Status</span>
            <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="font-mono">{health ? health.status.toUpperCase() : "CHECKING"}</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">PostgreSQL Pool (pgx)</span>
            <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-mono">{health?.services?.database?.status || "STANDBY"}</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Redis Cache (v7)</span>
            <div className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-mono">{health?.services?.redis?.status || "OPTIONAL"}</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/80 space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase">Backend Version</span>
            <div className="text-sm font-semibold text-zinc-200 font-mono">
              {health?.version ? `v${health.version}` : "v1.0.0"}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-mono">
            Notice: {errorMsg} (Run backend on :8080 to test live connection).
          </div>
        )}
      </section>

      {/* The Three Platform Pillars */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Three Unified Experiences</h2>
          <p className="text-sm text-zinc-400">All three experiences powered by the same Go backend and single PostgreSQL database.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <Terminal className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg">Public Explorer</CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                For guests and readers. Universal access without login paywalls, instant search, and code copying.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-zinc-400 space-y-2 font-mono">
              <div>• Zero paywalls or forced signups</div>
              <div>• PostgreSQL full-text search</div>
              <div>• React Server Components (RSC)</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 rounded bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
                <Layers className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg">Author Studio</CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                For engineering authors. Live markdown editor, code syntax highlighting, auto-saving drafts, and series.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-zinc-400 space-y-2 font-mono">
              <div>• Real-time markdown preview</div>
              <div>• Direct S3 asset uploads</div>
              <div>• Revision snapshots & metrics</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg">Super Admin Center</CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                For platform administrators. Moderation, audit logs, advertisement engine, and SES transactional queues.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-zinc-400 space-y-2 font-mono">
              <div>• Strict RBAC protection</div>
              <div>• Real-time audit trails</div>
              <div>• Transactional outbox health</div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
