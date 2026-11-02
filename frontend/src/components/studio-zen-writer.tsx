"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Maximize2,
  Minimize2,
  Eye,
  Columns,
  PenTool,
  Clock,
  FileText,
  Sparkles,
  X,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Code,
  Link as LinkIcon,
  Quote,
  List,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-editor";

interface StudioZenWriterProps {
  title: string;
  content: string;
  onChangeContent: (value: string) => void;
  onChangeTitle?: (value: string) => void;
  onClose?: () => void;
}

export function StudioZenWriterModal({
  title,
  content,
  onChangeContent,
  onChangeTitle,
  onClose,
}: StudioZenWriterProps) {
  const [viewMode, setViewMode] = useState<"write" | "split" | "preview">("write");
  const [fontFamily, setFontFamily] = useState<"sans" | "serif" | "mono">("mono");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate live word count & read time
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.length;
  const readTime = Math.max(1, Math.ceil(words / 225));

  // Handle ESC key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Insert markdown snippet at cursor
  const insertSnippet = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    onChangeContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    }, 0);
  };

  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "mono"
      ? "font-mono"
      : "font-sans";

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 flex flex-col animate-in fade-in zoom-in-95 duration-150">
      {/* Top Header Bar */}
      <header className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio Zen Writer</span>
          </span>
          <span className="text-zinc-600">&bull;</span>
          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-zinc-500" />
              <span>{words.toLocaleString()} words</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{readTime} min read</span>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline text-zinc-500">{chars.toLocaleString()} characters</span>
          </div>
        </div>

        {/* View Controls & Action */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            <button
              onClick={() => setViewMode("write")}
              className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors ${
                viewMode === "write"
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>Write</span>
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors ${
                viewMode === "split"
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1 transition-colors ${
                viewMode === "preview"
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>

          {/* Typeface Switcher */}
          <div className="hidden md:flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-xs font-mono">
            <button
              onClick={() => setFontFamily("mono")}
              className={`px-2 py-1 rounded transition-colors ${
                fontFamily === "mono" ? "bg-zinc-800 text-cyan-300 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Mono
            </button>
            <button
              onClick={() => setFontFamily("sans")}
              className={`px-2 py-1 rounded transition-colors ${
                fontFamily === "sans" ? "bg-zinc-800 text-cyan-300 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Sans
            </button>
            <button
              onClick={() => setFontFamily("serif")}
              className={`px-2 py-1 rounded transition-colors ${
                fontFamily === "serif" ? "bg-zinc-800 text-cyan-300 font-bold" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Serif
            </button>
          </div>

          {/* Close / Return */}
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors flex items-center gap-1"
            title="Return to Studio (Esc)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Zen</span>
          </button>
        </div>
      </header>

      {/* Quick Formatting Toolbar */}
      <div className="px-6 py-2 border-b border-zinc-900 bg-zinc-950/80 flex items-center gap-1 text-zinc-400">
        <button
          onClick={() => insertSnippet("**", "**", "bold")}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-xs"
          title="Bold (**text**)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSnippet("*", "*", "italic")}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-xs"
          title="Italic (*text*)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3 bg-zinc-800 mx-1" />
        <button
          onClick={() => insertSnippet("## ", "", "Section Heading")}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-xs"
          title="Heading 2 (## Title)"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSnippet("### ", "", "Subsection Heading")}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-xs"
          title="Heading 3 (### Title)"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-3 bg-zinc-800 mx-1" />
        <button
          onClick={() => insertSnippet("```go\n", "\n```", "// your code here")}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-xs"
          title="Code Block (```)"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSnippet("[", "](https://writnexa.dev)", "link label")}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-xs"
          title="Insert Link ([label](url))"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSnippet("> ", "", "quote text")}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-xs"
          title="Blockquote (>)"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => insertSnippet("- ", "", "item")}
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-zinc-200 text-xs"
          title="Unordered List (-)"
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-hidden flex">
        {/* Editor Pane */}
        {(viewMode === "write" || viewMode === "split") && (
          <div
            className={`h-full flex flex-col p-6 sm:p-10 overflow-y-auto ${
              viewMode === "split" ? "w-1/2 border-r border-zinc-800/80" : "w-full max-w-4xl mx-auto"
            }`}
          >
            {/* Title Input inside Zen Writer */}
            {onChangeTitle && (
              <input
                type="text"
                value={title}
                onChange={(e) => onChangeTitle(e.target.value)}
                placeholder="Article Title..."
                className="w-full bg-transparent text-3xl sm:text-4xl font-extrabold text-zinc-100 placeholder:text-zinc-600 focus:outline-none mb-6 border-b border-zinc-900 pb-4 font-sans"
              />
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChangeContent(e.target.value)}
              placeholder="Begin writing your engineering publication in Markdown..."
              className={`flex-1 w-full bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed text-base sm:text-lg ${fontClass}`}
              autoFocus
              spellCheck={false}
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div
            className={`h-full overflow-y-auto p-6 sm:p-10 bg-zinc-950/60 ${
              viewMode === "split" ? "w-1/2" : "w-full max-w-4xl mx-auto"
            }`}
          >
            <div className="max-w-3xl mx-auto space-y-6">
              {title && (
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 border-b border-zinc-800 pb-4 font-sans">
                  {title}
                </h1>
              )}
              {content ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-zinc-600 font-mono text-sm">Preview will appear here as you write...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

