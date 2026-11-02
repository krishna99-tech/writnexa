"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  BookOpen,
  ArrowLeft,
  Trash2,
  ExternalLink,
  History,
  Eye,
} from "lucide-react";

interface HistoryItem {
  id: string;
  article_id: string;
  article_title: string;
  article_slug: string;
  article_subtitle?: string | null;
  reading_time_minutes: number;
  author_display_name: string;
  author_username: string;
  scroll_percentage: number;
  read_at: string;
}

export default function ReadingHistoryPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?return_to=/reading-history");
      return;
    }

    if (accessToken) {
      fetch(`${API_BASE_URL}/api/v1/account/history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => res.json())
        .then((data: ApiResponse<{ history: HistoryItem[] }>) => {
          setLoading(false);
          if (data.success && data.data?.history) {
            setHistory(data.data.history);
          }
        })
        .catch(() => setLoading(false));
    }
  }, [authLoading, user, accessToken, router]);

  const handleClearHistory = async () => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to clear your reading history?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/v1/account/history`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setHistory([]);
    } catch {
      alert("Failed to clear reading history.");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Explore</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-100 flex items-center gap-3">
            <History className="w-7 h-7 text-emerald-400" />
            <span>Reading History</span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Articles and engineering essays you have read across WRITNEXA.
          </p>
        </div>

        {history.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearHistory}
            className="h-8 border-zinc-800 text-zinc-400 hover:text-rose-400 font-mono text-xs gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="p-16 text-center font-mono text-xs text-zinc-500">
          Loading your technical reading telemetry...
        </div>
      ) : history.length === 0 ? (
        <div className="p-16 text-center space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/20">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="font-mono font-bold text-sm text-zinc-300">
            No reading history recorded yet
          </h3>
          <p className="text-xs text-zinc-500 font-mono max-w-sm mx-auto">
            Explore distributed systems, compilers, security, and Linux kernel essays on WRITNEXA.
          </p>
          <Link href="/explore">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs">
              Explore Articles
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <Card key={item.id} className="bg-zinc-900/30 border-zinc-800/80 p-4 hover:border-zinc-700 transition-colors">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                    <span>by @{item.author_username}</span>
                    <span>•</span>
                    <span>Read on {new Date(item.read_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100 hover:text-emerald-400 transition-colors">
                    <Link href={`/article/${item.article_slug}`}>
                      {item.article_title}
                    </Link>
                  </h3>
                  {item.article_subtitle && (
                    <p className="text-xs text-zinc-400 line-clamp-1">
                      {item.article_subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-zinc-400">
                  {item.reading_time_minutes > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {item.reading_time_minutes} min
                    </span>
                  )}
                  <Link href={`/article/${item.article_slug}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs border-zinc-800 text-zinc-300">
                      Read Again
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

