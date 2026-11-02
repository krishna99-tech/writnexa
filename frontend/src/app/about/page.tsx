import React from "react";
import Link from "next/link";
import { Terminal, Shield, Cpu, Database, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About Us — WRITNEXA Platform",
  description: "The engineering-first publishing ecosystem for software architects and systems builders.",
};

export default function AboutPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-16 space-y-12">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>ABOUT WRITNEXA // ARCHITECTURE & MISSION</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-100">
          Built for Software Architects Who Build Production Systems
        </h1>
        <p className="text-lg text-zinc-400 font-sans leading-relaxed">
          The modern tech web is flooded with generic AI-generated listicles and paywalls. WRITNEXA was created to be the antidote: a high-fidelity publishing ecosystem where software engineers publish verifiable systems knowledge, flamegraphs, and benchmarks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Cpu className="w-6 h-6 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Zero Clickbait</h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Every technical article goes through structural moderation. Code blocks, architectural diagrams, and memory traces are required.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Database className="w-6 h-6 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Open by Default</h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            No subscriber paywalls, medium-style modal interruptions, or paywalled knowledge. All engineering articles are publicly readable and indexable.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Shield className="w-6 h-6 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Author Sovereignty</h3>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Authors own 100% of their intellectual property, canonical URLs, and audience relationships through transparent RSS and subscriptions.
          </p>
        </div>
      </div>

      <div className="p-8 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-950 space-y-4">
        <h2 className="text-xl font-bold text-zinc-100">Ready to publish your first deep dive?</h2>
        <p className="text-sm text-zinc-400 max-w-xl">
          Join verified software architects publishing insights on Go concurrency, PostgreSQL internals, and distributed consensus.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <Link href="/studio/articles/new">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs">
              Start Writing Now &rarr;
            </Button>
          </Link>
          <Link href="/explore">
            <Button variant="outline" className="border-zinc-700 font-mono text-xs text-zinc-300">
              Explore Publications
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

