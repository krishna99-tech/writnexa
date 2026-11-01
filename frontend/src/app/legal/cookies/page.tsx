import React from "react";
import { Terminal } from "lucide-react";

export const metadata = {
  title: "Cookie Policy — QUORIX",
  description: "Information about how QUORIX uses HTTP cookies and session tokens.",
};

export default function CookiePolicyPage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-16 space-y-8 font-sans">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>LEGAL // COOKIE POLICY</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-100">
          Cookie Policy
        </h1>
        <p className="text-xs font-mono text-zinc-500">
          Last revised: November 2026.
        </p>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">1. Essential Authentication Cookies</h2>
          <p>
            QUORIX uses secure, HttpOnly, SameSite=Strict cookies solely to manage rotating refresh token leases (`quorix_refresh_token`). These cookies protect against cross-site scripting (XSS) and cross-site request forgery (CSRF).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">2. No Third-Party Tracking Cookies</h2>
          <p>
            We do not use third-party advertising trackers, cross-site profiling cookies, or behavioral telemetry beacons.
          </p>
        </section>
      </div>
    </div>
  );
}

