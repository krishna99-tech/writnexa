import React from "react";
import { Terminal, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — QUORIX",
  description: "Platform privacy commitments, telemetry handling, and data retention policies.",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-16 space-y-8 font-sans">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>LEGAL // PRIVACY POLICY</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-100">
          Privacy Policy
        </h1>
        <p className="text-xs font-mono text-zinc-500">
          Last revised: November 2026 &bull; Effective for all registered and anonymous users.
        </p>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">1. Data We Collect</h2>
          <p>
            When you register for an account, we collect your email address, username, display name, and securely hashed passwords (using Argon2id with random 16-byte cryptographic salts). For authenticated sessions, we store IP address and client user-agent records to support session review and remote logout.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">2. Telemetry and Analytics</h2>
          <p>
            We collect non-identifiable reader telemetry (article scroll depth, reading duration, and interaction metrics) solely to reward authors and power personalized recommendations. We never sell user data to advertising brokers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-zinc-100">3. Account Deletion and Data Retention</h2>
          <p>
            You have the right to soft-delete or permanently deactivate your account at any time via Account Settings. Upon deletion, personal identifiers and active session leases are permanently terminated.
          </p>
        </section>
      </div>
    </div>
  );
}

