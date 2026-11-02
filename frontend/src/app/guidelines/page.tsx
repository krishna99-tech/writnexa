import React from "react";
import Link from "next/link";
import { Terminal, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

export const metadata = {
  title: "Author Guidelines & Community Rules — WRITNEXA",
  description: "Editorial quality standards, code verification criteria, and community conduct.",
};

export default function GuidelinesPage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-16 space-y-12">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>EDITORIAL POLICIES & CODE STANDARDS</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-100">
          Author Guidelines & Community Rules
        </h1>
        <p className="text-sm text-zinc-400 font-sans leading-relaxed">
          WRITNEXA is curated for senior software engineers, architects, and infrastructure specialists. All publications must meet the following standards.
        </p>
      </div>

      <div className="space-y-8">
        <div className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>What We Encourage</span>
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">&bull;</span>
              <span><strong>Production Case Studies:</strong> Real post-mortems, distributed systems outages, and scalability bottlenecks with metrics.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">&bull;</span>
              <span><strong>Concrete Code Traces:</strong> Runnable code samples, flamegraphs, explain analyze plans, or memory allocations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">&bull;</span>
              <span><strong>Architectural Trade-offs:</strong> Objective analysis of trade-offs rather than dogmatic "X is better than Y" assertions.</span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-950/10 space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-400" />
            <span>What Is Prohibited</span>
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">&bull;</span>
              <span><strong>Unedited AI Output:</strong> Generic AI-generated content lacking firsthand production experience.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">&bull;</span>
              <span><strong>Deceptive Promotion & Affiliate Spam:</strong> Articles disguised as technical tutorials solely to push paid services.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">&bull;</span>
              <span><strong>Plagiarism:</strong> Re-publishing other engineers&apos; research without attribution.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

