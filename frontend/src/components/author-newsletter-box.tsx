"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { subscribeNewsletter } from "@/lib/api";

interface AuthorNewsletterBoxProps {
  authorName?: string;
  authorUsername?: string;
  source?: string;
}

export function AuthorNewsletterBox({
  authorName,
  authorUsername,
  source = "article_bottom",
}: AuthorNewsletterBoxProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Please provide a valid engineering email address.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const res = await subscribeNewsletter(email, `${source}_${authorUsername || "platform"}`);
      if (res.success) {
        setStatus("success");
        setMessage("You are subscribed to technical architecture dispatches.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(res.error?.message || "Failed to subscribe. Please try again.");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Network error. Please try again.");
    }
  };

  return (
    <div className="my-10 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-zinc-900/60 p-6 sm:p-8 relative overflow-hidden shadow-xl">
      {/* Subtle Glow Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl space-y-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Mail className="w-4 h-4" />
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            Architectural Dispatches
          </span>
        </div>

        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-zinc-100 font-sans tracking-tight">
            {authorName
              ? `Follow ${authorName}'s engineering publications`
              : "Subscribe to WRITNEXA Engineering Dispatches"}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
            Get deep-dive systems engineering essays, failure post-mortems, and performance benchmarks delivered straight to your inbox. No spam, ever.
          </p>
        </div>

        {status === "success" ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{message}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@company.com"
                required
                disabled={status === "loading"}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {status === "loading" ? (
                  <span>Subscribing...</span>
                ) : (
                  <>
                    <span>Subscribe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {status === "error" && message && (
              <p className="text-xs font-mono text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{message}</span>
              </p>
            )}

            <p className="text-[11px] font-mono text-zinc-500">
              Zero marketing emails. One-click unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

