"use client";

import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Code,
  FileCode,
  Quote,
  List,
  ListOrdered,
  Table as TableIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Sigma,
  Copy,
  Check,
  Eye,
  Columns,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  minHeight = "480px",
  placeholder = "Write your technical article in Markdown...",
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "split" | "preview">("split");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    }, 0);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col shadow-xl">
      {/* Toolbar & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-2 text-zinc-400">
        {/* Formatting Actions */}
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarButton
            icon={<Bold className="w-3.5 h-3.5" />}
            title="Bold (**text**)"
            onClick={() => insertSnippet("**", "**", "bold text")}
          />
          <ToolbarButton
            icon={<Italic className="w-3.5 h-3.5" />}
            title="Italic (*text*)"
            onClick={() => insertSnippet("*", "*", "italic text")}
          />
          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
          <ToolbarButton
            icon={<Heading1 className="w-3.5 h-3.5" />}
            title="Heading 1"
            onClick={() => insertSnippet("# ", "", "Heading 1")}
          />
          <ToolbarButton
            icon={<Heading2 className="w-3.5 h-3.5" />}
            title="Heading 2"
            onClick={() => insertSnippet("## ", "", "Heading 2")}
          />
          <ToolbarButton
            icon={<Heading3 className="w-3.5 h-3.5" />}
            title="Heading 3"
            onClick={() => insertSnippet("### ", "", "Heading 3")}
          />
          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
          <ToolbarButton
            icon={<Code className="w-3.5 h-3.5" />}
            title="Inline Code"
            onClick={() => insertSnippet("`", "`", "code")}
          />
          <ToolbarButton
            icon={<FileCode className="w-3.5 h-3.5" />}
            title="Code Block"
            onClick={() => insertSnippet("```go\n", "\n```\n", "// write code here")}
          />
          <ToolbarButton
            icon={<Quote className="w-3.5 h-3.5" />}
            title="Blockquote"
            onClick={() => insertSnippet("> ", "", "Important technical quote")}
          />
          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
          <ToolbarButton
            icon={<List className="w-3.5 h-3.5" />}
            title="Bullet List"
            onClick={() => insertSnippet("- ", "", "Item")}
          />
          <ToolbarButton
            icon={<ListOrdered className="w-3.5 h-3.5" />}
            title="Numbered List"
            onClick={() => insertSnippet("1. ", "", "First step")}
          />
          <ToolbarButton
            icon={<TableIcon className="w-3.5 h-3.5" />}
            title="Markdown Table"
            onClick={() =>
              insertSnippet(
                "| Header 1 | Header 2 |\n| :--- | :--- |\n| Value A | Value B |\n| Value C | Value D |\n"
              )
            }
          />
          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
          <ToolbarButton
            icon={<LinkIcon className="w-3.5 h-3.5" />}
            title="Insert Link"
            onClick={() => insertSnippet("[", "](https://example.com)", "link title")}
          />
          <ToolbarButton
            icon={<ImageIcon className="w-3.5 h-3.5" />}
            title="Insert Image"
            onClick={() => insertSnippet("![", "](https://images.unsplash.com/...)", "alt caption")}
          />
          <ToolbarButton
            icon={<Sigma className="w-3.5 h-3.5" />}
            title="Math Formula (KaTeX)"
            onClick={() => insertSnippet("$$ ", " $$", "\\mathcal{O}(N \\log N)")}
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
              activeTab === "write"
                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <PenTool className="w-3 h-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("split")}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
              activeTab === "split"
                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
              activeTab === "preview"
                ? "bg-zinc-800 text-zinc-100 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor & Preview Panes */}
      <div
        className={`grid ${
          activeTab === "split"
            ? "grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800"
            : "grid-cols-1"
        }`}
        style={{ minHeight }}
      >
        {/* Write Pane */}
        {(activeTab === "write" || activeTab === "split") && (
          <div className="relative flex flex-col h-full bg-zinc-950">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full h-full min-h-[480px] p-4 bg-transparent text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed selection:bg-emerald-950 selection:text-emerald-300"
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(activeTab === "preview" || activeTab === "split") && (
          <div className="p-6 overflow-y-auto max-h-[800px] bg-zinc-900/20">
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className="h-full flex items-center justify-center font-mono text-xs text-zinc-600 italic">
                Live rendered preview will appear here...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
    >
      {icon}
    </button>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 space-y-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 mt-6 mb-4 tracking-tight pb-2 border-b border-zinc-800">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 mt-5 mb-3 tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-zinc-200 mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm sm:text-base leading-relaxed text-zinc-300 my-3">
              {children}
            </p>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-500/80 bg-zinc-900/40 p-4 rounded-r-lg my-4 italic text-zinc-300 text-sm">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 text-sm sm:text-base text-zinc-300 my-3 pl-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 text-sm sm:text-base text-zinc-300 my-3 pl-2">
              {children}
            </ol>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-zinc-800">
              <table className="w-full text-left border-collapse text-xs sm:text-sm font-mono">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-zinc-900 text-zinc-200 border-b border-zinc-800">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="p-3 font-semibold text-zinc-100 tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-3 border-t border-zinc-800/80 text-zinc-300">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/40 hover:decoration-emerald-400 transition-colors font-medium"
            >
              {children}
            </a>
          ),
          code({ className, children, ...props }) {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-300 font-mono text-xs sm:text-sm border border-zinc-700/60"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlockWithCopy className={className} {...props}>
                {children}
              </CodeBlockWithCopy>
            );
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <figure className="my-6">
              <img
                src={src}
                alt={alt || "Article illustration"}
                className="rounded-xl border border-zinc-800 max-h-[500px] w-full object-cover shadow-lg"
              />
              {alt && (
                <figcaption className="text-center font-mono text-xs text-zinc-500 mt-2">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlockWithCopy({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const codeContent = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "code";

  return (
    <div className="relative group my-4 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/60 text-xs font-mono text-zinc-400">
        <span className="text-emerald-400 font-semibold uppercase text-[11px] tracking-wider">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-zinc-200 leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
