"use client";

import React from "react";
import Link from "next/link";
import { WritnexaLogo } from "@/components/writnexa-logo";
import {
  Terminal,
  Shield,
  Key,
  Mail,
  Users,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Layers,
  Cpu,
  GitBranch,
  ShieldCheck,
  Zap,
} from "lucide-react";

export type AuthPageType =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "verify-email";

interface AuthSplitLayoutProps {
  pageType: AuthPageType;
  title: string;
  description: string;
  badge?: string;
  quote?: {
    text: string;
    author: string;
    role: string;
  };
  children: React.ReactNode;
}

export function AuthSplitLayout({
  pageType,
  title,
  description,
  badge = "WRITNEXA Auth",
  quote,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-zinc-950 text-zinc-100 overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* ===================================================================== */}
      {/* LEFT PANEL: Rich Developer Visuals, Illustration & Brand Manifesto   */}
      {/* ===================================================================== */}
      <div className="relative w-full lg:w-[48%] xl:w-[50%] p-4 sm:p-6 lg:p-12 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-zinc-950 shrink-0">
        {/* Subtle Ambient Glowing Gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        {/* Subtle Grid Backdrop Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #10b981 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top: Brand Header & Platform Return Link */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <WritnexaLogo variant="full" size="md" href="/" />

          <Link
            href="/explore"
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explore Articles</span>
            <span className="sm:hidden">Explore</span>
          </Link>
        </div>

        {/* Middle: Page-Specific Illustration & Feature Showcase (Desktop and large tablet) */}
        <div className="hidden lg:block relative z-10 my-8 sm:my-12 space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 font-mono text-[11px] shadow-sm">
              <Sparkles className="w-3 h-3" />
              <span>{badge}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-mono text-zinc-100 leading-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-lg leading-relaxed">
              {description}
            </p>
          </div>

          {/* Dedicated Page-Specific Illustrated Mockup */}
          <div className="pt-2">
            {pageType === "login" && <DeveloperWorkspaceIllustration />}
            {pageType === "register" && <DeveloperCommunityIllustration />}
            {pageType === "forgot-password" && <EmailRecoveryIllustration />}
            {pageType === "reset-password" && <SecurityShieldIllustration />}
            {pageType === "verify-email" && <EmailVerificationIllustration />}
          </div>
        </div>

        {/* Bottom: Engineering Endorsement / Assurance Quote (Desktop only) */}
        <div className="hidden lg:block relative z-10 pt-6 border-t border-zinc-800/60 font-mono text-xs">
          {quote ? (
            <div className="space-y-1.5">
              <p className="text-zinc-300 italic font-sans text-xs">
                &ldquo;{quote.text}&rdquo;
              </p>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="text-emerald-400 font-semibold">{quote.author}</span>
                <span>•</span>
                <span>{quote.role}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 text-zinc-500 text-[11px]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Argon2id Memory-Hard Cryptography</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Zero-Trust Session Isolation</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* RIGHT PANEL: The Active Form Surface                                  */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-8 lg:p-12 xl:p-16 relative bg-zinc-950 min-h-[calc(100vh-64px)] lg:min-h-screen">
        <div className="w-full max-w-md mx-auto my-auto py-4">
          {children}
        </div>

        {/* Right Panel Clean Footer Links */}
        <footer className="w-full max-w-md mx-auto pt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span>&copy; {new Date().getFullYear()} WRITNEXA Inc.</span>
          </div>
          <nav className="flex items-center gap-4 text-zinc-400">
            <Link href="/legal/privacy" className="hover:text-emerald-400 transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-emerald-400 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-emerald-400 transition-colors">
              Support
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 1. LOGIN ILLUSTRATION: Developer Workspace IDE Mockup                     */
/* ========================================================================= */
function DeveloperWorkspaceIllustration() {
  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-4 font-mono text-xs shadow-2xl space-y-3 backdrop-blur-sm max-w-md">
      {/* Window Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="text-[11px] text-zinc-400 ml-2">raft_cluster.go</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
          Node-01 // Leader
        </span>
      </div>

      {/* Code Snippet */}
      <div className="space-y-1 text-[11px] leading-relaxed text-zinc-300">
        <p className="text-zinc-500">// Initialize distributed Raft log state machine</p>
        <p>
          <span className="text-purple-400">func</span>{" "}
          <span className="text-blue-400">CommitEntry</span>(entry *LogEntry){" "}
          <span className="text-purple-400">error</span> &#123;
        </p>
        <p className="pl-4">
          <span className="text-zinc-400">if</span> !node.isLeader &#123;{" "}
          <span className="text-rose-400">return</span> ErrNotLeader &#125;
        </p>
        <p className="pl-4 text-emerald-400">
          return node.replicateQuorum(entry.Term, entry.Index)
        </p>
        <p>&#125;</p>
      </div>

      {/* Telemetry Footer */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Raft Quorum: 3/3 Replicated</span>
        </div>
        <span className="text-zinc-500">Latency: 1.4ms</span>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 2. REGISTER ILLUSTRATION: Developer Community Network Topology            */
/* ========================================================================= */
function DeveloperCommunityIllustration() {
  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-4 font-mono text-xs shadow-2xl space-y-3 backdrop-blur-sm max-w-md">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-bold text-zinc-200">Global Engineering Network</span>
        </div>
        <span className="text-[10px] text-cyan-400 font-bold uppercase">12,000+ Authors</span>
      </div>

      {/* Topic Clusters */}
      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
        <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <span className="text-zinc-400 text-[10px] block">SYSTEMS & KERNEL</span>
          <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            eBPF & Linux
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <span className="text-zinc-400 text-[10px] block">DISTRIBUTED CLUSTERS</span>
          <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            Consensus & Raft
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <span className="text-zinc-400 text-[10px] block">RUNTIME & COMPILERS</span>
          <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            LLVM, Rust & Go
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1">
          <span className="text-zinc-400 text-[10px] block">OBSERVABILITY</span>
          <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            OpenTelemetry
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Peer-reviewed essays</span>
        <span className="text-emerald-400">Verified identity only</span>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. FORGOT PASSWORD ILLUSTRATION: Cryptographic Email Recovery             */
/* ========================================================================= */
function EmailRecoveryIllustration() {
  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-4 font-mono text-xs shadow-2xl space-y-3 backdrop-blur-sm max-w-md">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-bold text-zinc-200">Zero-Knowledge Recovery</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-bold uppercase">SHA-256 HMAC</span>
      </div>

      <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-[11px]">
        <div className="flex items-center justify-between text-zinc-400">
          <span>Token Generation</span>
          <span className="text-emerald-400">Single-Use (24h)</span>
        </div>
        <div className="p-2 bg-zinc-950 rounded border border-zinc-800/80 text-[10px] text-zinc-500 break-all select-all">
          0x4f8a...e91c7b82 // argon2id_v19_entropy
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Active sessions remain locked until identity handshake</span>
        </div>
      </div>

      <div className="pt-1 text-[10px] text-zinc-500 flex items-center justify-between">
        <span>Delivery: SMTP / TLS 1.3</span>
        <span>Anti-Phishing Token</span>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 4. RESET PASSWORD ILLUSTRATION: Security & Argon2id Matrix                */
/* ========================================================================= */
function SecurityShieldIllustration() {
  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-4 font-mono text-xs shadow-2xl space-y-3 backdrop-blur-sm max-w-md">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-bold text-zinc-200">Argon2id Hash Hardening</span>
        </div>
        <span className="text-[10px] text-amber-400 font-bold uppercase">64 MB RAM</span>
      </div>

      <div className="space-y-2 text-[11px]">
        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 block">Memory</span>
            <span className="text-zinc-200 font-bold">65,536 KB</span>
          </div>
          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 block">Iterations</span>
            <span className="text-zinc-200 font-bold">3 Passes</span>
          </div>
          <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800">
            <span className="text-zinc-500 block">Threads</span>
            <span className="text-zinc-200 font-bold">4 Threads</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400">
          Upon reset, all active refresh tokens and device sessions are permanently invalidated to secure compromised accounts.
        </p>
      </div>

      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-emerald-400" />
          GPU-Resistant KDF
        </span>
        <span className="text-emerald-400">RFC 9106</span>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 5. VERIFY EMAIL ILLUSTRATION: Email Verification Handshake                */
/* ========================================================================= */
function EmailVerificationIllustration() {
  return (
    <div className="rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-4 font-mono text-xs shadow-2xl space-y-3 backdrop-blur-sm max-w-md">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-purple-400" />
          <span className="text-[11px] font-bold text-zinc-200">Cryptographic Handshake</span>
        </div>
        <span className="text-[10px] text-purple-400 font-bold uppercase">Verified Email</span>
      </div>

      <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-[11px]">
        <div className="flex items-center gap-2 text-zinc-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Unlocks Author Studio publishing</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Enables technical discussion comments</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Grants verified community badge</span>
        </div>
      </div>

      <div className="pt-1 text-[10px] text-zinc-500 flex items-center justify-between">
        <span>Domain validation</span>
        <span className="text-emerald-400">Instant activation</span>
      </div>
    </div>
  );
}

