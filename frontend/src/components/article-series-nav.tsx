"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  BookOpen,
} from "lucide-react";
import { ArticleSeriesDetail } from "@/lib/api";

interface ArticleSeriesNavProps {
  series: ArticleSeriesDetail | null;
}

export function ArticleSeriesHeader({ series }: ArticleSeriesNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!series || series.total_parts <= 1) {
    return null;
  }

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-zinc-900/50 to-zinc-950/50 dark:border-cyan-800/40 p-4 sm:p-5 shadow-sm transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
              <Layers className="w-3 h-3" />
              <span>Engineering Series &bull; Part {series.current_part} of {series.total_parts}</span>
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-100 font-sans tracking-tight">
            {series.title}
          </h2>
        </div>

        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 transition-colors"
        >
          <span>{isExpanded ? "Hide All Parts" : `View All ${series.total_parts} Parts`}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>
      </div>

      {series.description && (
        <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
          {series.description}
        </p>
      )}

      {/* Expandable Series Items List */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-2 animate-in fade-in duration-150">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
            Series Progression Roadmap:
          </div>
          <div className="space-y-1.5">
            {series.items.map((item) => (
              <Link
                key={item.slug}
                href={`/article/${item.slug}`}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-mono transition-colors ${
                  item.is_current
                    ? "bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-medium"
                    : "hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      item.is_current
                        ? "bg-cyan-500 text-zinc-950"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {item.order_index}
                  </span>
                  <span className="truncate">{item.title}</span>
                </div>

                <div className="flex items-center gap-2 text-zinc-500 flex-shrink-0 ml-3">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{item.reading_time_minutes}m</span>
                  </span>
                  {item.is_current && (
                    <span className="text-[10px] uppercase font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                      Reading
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ArticleSeriesFooter({ series }: ArticleSeriesNavProps) {
  if (!series || series.total_parts <= 1) {
    return null;
  }

  return (
    <div className="my-8 pt-8 border-t border-zinc-800 space-y-4">
      <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
        <span className="flex items-center gap-1.5 text-zinc-400">
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Part of Series: <strong className="text-zinc-200">{series.title}</strong></span>
        </span>
        <span>
          Part {series.current_part} of {series.total_parts}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Previous Article in Series */}
        {series.prev_article ? (
          <Link
            href={`/article/${series.prev_article.slug}`}
            className="group flex flex-col justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all text-left"
          >
            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 group-hover:text-cyan-400 transition-colors">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              <span>Previous Part {series.prev_article.order_index}</span>
            </div>
            <div className="mt-1 font-semibold text-sm text-zinc-200 group-hover:text-zinc-100 line-clamp-2">
              {series.prev_article.title}
            </div>
          </Link>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-zinc-800/60 bg-zinc-900/10 text-zinc-600 text-xs font-mono flex items-center justify-center">
            You are at Part 1 (First in Series)
          </div>
        )}

        {/* Next Article in Series */}
        {series.next_article ? (
          <Link
            href={`/article/${series.next_article.slug}`}
            className="group flex flex-col justify-between p-4 rounded-xl border border-cyan-900/40 bg-cyan-950/20 hover:bg-cyan-950/40 hover:border-cyan-700/60 transition-all text-right"
          >
            <div className="text-[11px] font-mono text-cyan-500 flex items-center justify-end gap-1 group-hover:text-cyan-400 transition-colors">
              <span>Next Part {series.next_article.order_index}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="mt-1 font-semibold text-sm text-zinc-200 group-hover:text-white line-clamp-2">
              {series.next_article.title}
            </div>
          </Link>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-zinc-800/60 bg-zinc-900/10 text-zinc-500 text-xs font-mono flex items-center justify-center gap-1.5 text-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Completed Final Part of this Series!</span>
          </div>
        )}
      </div>
    </div>
  );
}

