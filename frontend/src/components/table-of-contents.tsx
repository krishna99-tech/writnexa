"use client";

import React, { useState, useEffect } from "react";
import { List, ChevronDown, ChevronUp, Hash, Bookmark } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Parse headings from Markdown string
  useEffect(() => {
    const lines = content.split("\n");
    const extracted: TocItem[] = [];

    lines.forEach((line) => {
      const h2Match = line.match(/^##\s+(.+)$/);
      const h3Match = line.match(/^###\s+(.+)$/);

      if (h2Match) {
        const text = h2Match[1].replace(/[*_`]/g, "").trim();
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        if (text && id) {
          extracted.push({ id, text, level: 2 });
        }
      } else if (h3Match) {
        const text = h3Match[1].replace(/[*_`]/g, "").trim();
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        if (text && id) {
          extracted.push({ id, text, level: 3 });
        }
      }
    });

    setItems(extracted);
  }, [content]);

  // Track active heading using IntersectionObserver
  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0.1,
      }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label="Table of Contents"
      className="my-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 transition-all shadow-sm"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-2 group text-left"
        >
          <div className="p-1 rounded bg-zinc-800 text-cyan-400">
            <List className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono text-xs uppercase tracking-wider font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">
            Table of Contents
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            ({items.length} sections)
          </span>
        </button>

        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label={isExpanded ? "Collapse outline" : "Expand outline"}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {isExpanded && (
        <ul className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1 text-xs font-sans animate-in fade-in duration-150">
          {items.map((item) => {
            const isActive = activeId === item.id;
            return (
              <li
                key={item.id}
                className={`${item.level === 3 ? "pl-5 text-zinc-400" : "text-zinc-300"}`}
              >
                <a
                  href={`#${item.id}`}
                  className={`group flex items-center gap-1.5 py-1 px-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 font-medium"
                      : "hover:bg-zinc-800/50 hover:text-zinc-100"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-cyan-400" : "bg-zinc-600 group-hover:bg-zinc-400"
                    }`}
                  />
                  <span className="truncate">{item.text}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

