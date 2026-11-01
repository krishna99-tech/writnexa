import React from "react";
import Link from "next/link";
import { Terminal, BookOpen, PenTool, Key, Search, Users } from "lucide-react";

export const metadata = {
  title: "Help Center — QUORIX",
  description: "Knowledge base and troubleshooting guides for readers and authors.",
};

export default function HelpPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-16 space-y-12">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>DOCUMENTATION & USER GUIDES</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-100">
          QUORIX Help Center
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Find answers to common questions about reading, author studio workflows, and account settings.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <PenTool className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Authoring & Markdown</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Learn how to use our Markdown editor, KaTeX formulas, code syntax highlighting, and table formatting.
          </p>
          <Link href="/studio/articles/new" className="text-xs font-mono text-emerald-400 hover:underline block pt-2">
            Open Author Studio &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Key className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Account Security & Sessions</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Manage your password rotation, active device sessions, and multi-device token invalidation.
          </p>
          <Link href="/settings?tab=security" className="text-xs font-mono text-emerald-400 hover:underline block pt-2">
            Security Settings &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Search className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Search & Discovery</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Use full-text search operators, topic filtering, and author matching to find systems case studies.
          </p>
          <Link href="/search" className="text-xs font-mono text-emerald-400 hover:underline block pt-2">
            Search Platform &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Users className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Community & Following</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Follow authors, manage your reading bookmarks, and participate in threaded architectural discussions.
          </p>
          <Link href="/settings?tab=network" className="text-xs font-mono text-emerald-400 hover:underline block pt-2">
            Network Management &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

