import React from "react";
import { Terminal } from "lucide-react";

export const metadata = {
  title: "Terms of Service — WRITNEXA",
  description: "Terms and conditions governing access to the WRITNEXA developer publishing platform.",
};

export default function TermsPage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-16 space-y-8 font-sans">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>LEGAL // TERMS OF SERVICE</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-100">
          Terms of Service
        </h1>
        <p className="text-xs font-mono text-zinc-500">
          Last revised: November 2026 &bull; Effective globally.
        </p>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the WRITNEXA platform, API, or services, you agree to be bound by these Terms of Service. If you do not agree, you must not access the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">2. Author Content Ownership</h2>
          <p>
            You retain all copyright and intellectual property rights in the articles and code samples you publish on WRITNEXA. By publishing, you grant WRITNEXA a worldwide, non-exclusive license to host, display, and format your content for platform readers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">3. Acceptable Use</h2>
          <p>
            You agree not to attempt to compromise system integrity, probe unauthenticated endpoints, conduct denial-of-service attacks, or upload malicious payloads or scrapers that exceed reasonable request rate limits.
          </p>
        </section>
      </div>
    </div>
  );
}

