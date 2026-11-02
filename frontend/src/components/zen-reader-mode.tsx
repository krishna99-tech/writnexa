"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Maximize2,
  Minimize2,
  Type,
  AlignLeft,
  X,
  Clock,
  BookOpen,
  ArrowUp,
  Sliders,
  Check,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-editor";

interface ZenReaderModeProps {
  title: string;
  subtitle?: string | null;
  authorName: string;
  authorUsername: string;
  readingTimeMinutes: number;
  publishedDate: string;
  content: string;
}

export function ZenReaderMode({
  title,
  subtitle,
  authorName,
  authorUsername,
  readingTimeMinutes,
  publishedDate,
  content,
}: ZenReaderModeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("serif");
  const [fontSize, setFontSize] = useState<"compact" | "normal" | "large" | "xlarge">("normal");
  const [columnWidth, setColumnWidth] = useState<"narrow" | "standard" | "wide">("standard");
  const [showControls, setShowControls] = useState(false);
  const [focusGuide, setFocusGuide] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Global 'z' shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === "z" || e.key === "Z") {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }

      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Handle scroll progress in Zen mode
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const total = el.scrollHeight - el.clientHeight;
    if (total > 0) {
      setScrollProgress(Math.min(100, Math.max(0, (el.scrollTop / total) * 100)));
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Font family styles
  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "mono"
      ? "font-mono"
      : "font-sans";

  // Font size styles
  const sizeClass =
    fontSize === "compact"
      ? "text-base leading-relaxed"
      : fontSize === "normal"
      ? "text-lg leading-loose"
      : fontSize === "large"
      ? "text-xl leading-loose"
      : "text-2xl leading-loose";

  // Column width styles
  const widthClass =
    columnWidth === "narrow"
      ? "max-w-xl"
      : columnWidth === "standard"
      ? "max-w-2xl"
      : "max-w-4xl";

  return (
    <>
      {/* Floating Zen Trigger Pill on Normal Page */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono bg-zinc-900/90 dark:bg-zinc-800/80 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-300 dark:text-zinc-200 border border-zinc-700/60 dark:border-zinc-600/60 shadow-md backdrop-blur transition-all duration-200 hover:scale-105 active:scale-95 group"
        title="Distraction-free Zen Reading Mode (Press 'Z')"
      >
        <BookOpen className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-6 transition-transform" />
        <span className="font-medium">Zen Mode</span>
        <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-zinc-800 dark:bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-400">
          Z
        </kbd>
      </button>

      {/* Fullscreen Zen Reading Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-200 animate-in fade-in zoom-in-95 duration-150">
          {/* Top Reading Progress Bar */}
          <div className="fixed top-0 left-0 w-full h-1 bg-zinc-200 dark:bg-zinc-900 z-50">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-500 to-purple-600 transition-all duration-100"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>

          {/* Top Floating Control Bar */}
          <header className="sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/80 dark:border-zinc-900/80">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tracking-widest uppercase text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zen Sanctum</span>
              </span>
              <span className="text-zinc-400 dark:text-zinc-600">&bull;</span>
              <span className="text-xs font-mono text-zinc-500">
                {Math.round(scrollProgress)}% read
              </span>
            </div>

            {/* Customizer Controls Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowControls((v) => !v)}
                  className="px-3 py-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5"
                  title="Customize typography & canvas"
                >
                  <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Typography</span>
                </button>

                {showControls && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 space-y-4 z-50 text-xs font-sans">
                    {/* Font Family */}
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                        Typeface
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => setFontFamily("sans")}
                          className={`py-1.5 px-2 rounded-md font-sans border text-xs transition-colors ${
                            fontFamily === "sans"
                              ? "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold"
                              : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          Sans
                        </button>
                        <button
                          onClick={() => setFontFamily("serif")}
                          className={`py-1.5 px-2 rounded-md font-serif border text-xs transition-colors ${
                            fontFamily === "serif"
                              ? "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold"
                              : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          Serif
                        </button>
                        <button
                          onClick={() => setFontFamily("mono")}
                          className={`py-1.5 px-2 rounded-md font-mono border text-xs transition-colors ${
                            fontFamily === "mono"
                              ? "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold"
                              : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          Mono
                        </button>
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                        Text Size
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {(["compact", "normal", "large", "xlarge"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setFontSize(s)}
                            className={`py-1.5 rounded-md border text-xs capitalize transition-colors ${
                              fontSize === s
                                ? "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {s === "compact" ? "S" : s === "normal" ? "M" : s === "large" ? "L" : "XL"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Column Width */}
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                        Canvas Width
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {(["narrow", "standard", "wide"] as const).map((w) => (
                          <button
                            key={w}
                            onClick={() => setColumnWidth(w)}
                            className={`py-1.5 rounded-md border text-xs capitalize transition-colors ${
                              columnWidth === w
                                ? "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-500 text-cyan-700 dark:text-cyan-300 font-bold"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reading Focus Ruler */}
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Focus Guide</span>
                      <button
                        onClick={() => setFocusGuide((v) => !v)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                          focusGuide
                            ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "border-zinc-300 dark:border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {focusGuide ? "Enabled" : "Off"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Close Zen Mode Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-mono rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5"
                title="Exit Zen Mode (Esc)"
              >
                <span>Exit</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-500">
                  Esc
                </kbd>
              </button>
            </div>
          </header>

          {/* Reading Scrollable Viewport */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-6 py-16 scroll-smooth"
          >
            <main className={`mx-auto ${widthClass} space-y-12 transition-all duration-150`}>
              {/* Zen Article Header */}
              <header className="space-y-6 pb-8 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
                  <span>@{authorUsername}</span>
                  <span>&bull;</span>
                  <span>{publishedDate}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{readingTimeMinutes} min read</span>
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-zinc-950 dark:text-zinc-50 font-sans">
                  {title}
                </h1>

                {subtitle && (
                  <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                    {subtitle}
                  </p>
                )}
              </header>

              {/* Article Content */}
              <article
                className={`${fontClass} ${sizeClass} text-zinc-800 dark:text-zinc-200 leading-loose ${
                  focusGuide ? "focus-guide-active" : ""
                }`}
              >
                <MarkdownRenderer content={content} />
              </article>

              {/* Zen Completion Footer */}
              <footer className="pt-16 pb-24 border-t border-zinc-200 dark:border-zinc-800 text-center space-y-4">
                <div className="inline-flex p-3 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 border border-cyan-500/30">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-sans">You&apos;ve completed this technical deep dive</h3>
                <p className="text-sm text-zinc-500 font-mono">
                  Written by {authorName} (@{authorUsername}) &bull; WRITNEXA Engineering Journal
                </p>
                <div className="pt-4 flex items-center justify-center gap-3">
                  <button
                    onClick={scrollToTop}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-800 text-xs font-mono hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Back to Top</span>
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90 transition-opacity"
                  >
                    <span>Exit Zen Sanctum</span>
                  </button>
                </div>
              </footer>
            </main>
          </div>
        </div>
      )}
    </>
  );
}

