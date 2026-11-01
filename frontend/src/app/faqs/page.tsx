import React from "react";
import Link from "next/link";
import { Terminal, HelpCircle } from "lucide-react";

export const metadata = {
  title: "Frequently Asked Questions — QUORIX",
  description: "Common questions and answers regarding publishing, content ownership, and technical standards.",
};

export default function FAQsPage() {
  const faqs = [
    {
      q: "Is QUORIX completely free for software engineers?",
      a: "Yes. All technical articles, benchmarks, and architectural breakdowns on QUORIX are 100% free to read without paywalls or required subscriptions.",
    },
    {
      q: "Who owns the copyright of articles published on QUORIX?",
      a: "Authors retain full intellectual property rights to their articles. You can set canonical URLs pointing to your personal blog and export your Markdown content at any time.",
    },
    {
      q: "What types of content are welcome on QUORIX?",
      a: "We prioritize deep technical write-ups: systems architecture, database internals, low-level concurrency, Linux kernel and eBPF tracing, networking protocols, and performance engineering.",
    },
    {
      q: "How does the author reputation score work?",
      a: "Reputation score is earned through verified publications, bookmarks from the engineering community, and peer discussion contributions.",
    },
    {
      q: "Can I cross-post articles from my personal blog?",
      a: "Yes. Use the canonical URL setting in the Author Studio editor to ensure search engines attribute primary SEO ranking to your original blog post.",
    },
  ];

  return (
    <div className="container max-w-3xl mx-auto px-4 py-16 space-y-12">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>FREQUENTLY ASKED QUESTIONS</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-100">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Everything you need to know about publishing and reading on the QUORIX platform.
        </p>
      </div>

      <div className="space-y-6">
        {faqs.map((f, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2"
          >
            <h3 className="font-bold text-zinc-100 text-base flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
              <span>{f.q}</span>
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed pl-6.5">
              {f.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

