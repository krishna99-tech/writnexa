import React from "react";
import { Terminal } from "lucide-react";

export const metadata = {
  title: "Copyright Policy & DMCA — QUORIX",
  description: "Intellectual property protection, attribution rules, and notice/takedown procedures.",
};

export default function CopyrightPolicyPage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-16 space-y-8 font-sans">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>LEGAL // COPYRIGHT & DMCA</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-100">
          Copyright Policy & DMCA
        </h1>
        <p className="text-xs font-mono text-zinc-500">
          Last revised: November 2026.
        </p>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">1. Intellectual Property Protection</h2>
          <p>
            QUORIX respects the intellectual property rights of software authors, researchers, and engineers. Authors maintain complete copyright over original writings, benchmarks, and architectural designs posted on the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">2. Notice and Takedown Requests</h2>
          <p>
            If you believe your copyrighted work has been reproduced on QUORIX in a manner that constitutes infringement, please submit a written notification with the URL, proof of ownership, and signature to:
          </p>
          <p className="font-mono text-emerald-400 text-xs pt-1">
            legal@quorix.io &bull; Subject: DMCA Takedown Request
          </p>
        </section>
      </div>
    </div>
  );
}

