"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { subscribeNewsletter, unsubscribeNewsletter } from "@/lib/api";
import { AdPlacement } from "./ad-placement";
import { WritnexaLogo } from "./writnexa-logo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Terminal,
  Github,
  Twitter,
  Linkedin,
  Rss,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  Heart,
  ExternalLink,
} from "lucide-react";

export function Footer() {
  const pathname = usePathname();

  // 1. Never show footer in Workspace (/dashboard), Studio (/studio), Admin (/admin), or Settings (/settings)
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings")
  ) {
    return null;
  }

  // 2. Auth pages use dedicated self-contained AuthSplitLayout (Login, Register, Forgot Password, Reset Password, Verify Email)
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname.startsWith("/(auth)");

  if (isAuthPage) {
    return null;
  }

  // 3. Full Global Community Footer for Landing, Explore, Article, Authors, Topics, Search, etc.
  return <GlobalFooter />;
}

/* ========================================================================= */
/* MINIMAL FOOTER (Login, Register & Auth flows)                             */
/* ========================================================================= */
function MinimalFooter() {
  return (
    <footer className="w-full border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur py-6 text-xs text-zinc-500 font-mono mt-auto">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <WritnexaLogo variant="icon" size="xs" />
          <span>&copy; {new Date().getFullYear()} WRITNEXA Inc. All rights reserved.</span>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-zinc-400">
          <Link href="/legal/privacy" className="hover:text-emerald-400 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/legal/terms" className="hover:text-emerald-400 transition-colors">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-emerald-400 transition-colors">
            Support
          </Link>
          <Link href="/" className="hover:text-emerald-400 transition-colors">
            Platform Home
          </Link>
        </nav>
      </div>
    </footer>
  );
}

/* ========================================================================= */
/* GLOBAL REUSABLE FOOTER (Public & Community Layouts)                       */
/* ========================================================================= */
function GlobalFooter() {
  const [email, setEmail] = useState("");
  const [isUnsubscribeMode, setIsUnsubscribeMode] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!validateEmail(cleanEmail)) {
      setStatus("error");
      setFeedbackMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setFeedbackMessage("");

    try {
      if (isUnsubscribeMode) {
        const res = await unsubscribeNewsletter(cleanEmail);
        if (res.success && res.data) {
          setStatus("success");
          setFeedbackMessage(res.data.message);
          setEmail("");
        } else {
          setStatus("error");
          setFeedbackMessage(res.error?.message || "Failed to process unsubscribe request.");
        }
      } else {
        const res = await subscribeNewsletter(cleanEmail, "global_footer");
        if (res.success && res.data) {
          setStatus("success");
          setFeedbackMessage(res.data.message);
          setEmail("");
        } else {
          setStatus("error");
          setFeedbackMessage(res.error?.message || "Could not reach subscription service. Please try again.");
        }
      }
    } catch {
      setStatus("error");
      setFeedbackMessage("Network error connecting to subscription server.");
    }
  };

  return (
    <footer className="w-full border-t border-zinc-800 bg-zinc-950 text-zinc-400 mt-auto">
      {/* Global Footer Advertisement Banner */}
      <div className="container mx-auto px-4 pt-8">
        <AdPlacement slotKey="footer_banner" className="max-w-5xl mx-auto" />
      </div>

      {/* Main Footer Directory Grid */}
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand Info & Mission (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <WritnexaLogo variant="full" size="md" href="/" showVersion />

            <p className="text-sm text-zinc-400 font-sans leading-relaxed max-w-sm">
              The high-fidelity developer publishing ecosystem for software architects, systems engineers, and open-source practitioners. Pure engineering deep dives with zero clickbait.
            </p>

            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com/writnexa-platform"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub Repository"
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com/writnexa_dev"
                target="_blank"
                rel="noreferrer"
                aria-label="X / Twitter"
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com/company/writnexa-platform"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn Profile"
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <Link
                href="/explore"
                aria-label="RSS Feed"
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-amber-400 hover:border-zinc-700 transition-colors"
              >
                <Rss className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Navigation Column 1: Explore */}
          <div className="space-y-3 font-sans text-sm">
            <h3 className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Explore
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/authors" className="hover:text-emerald-400 transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <Link href="/explore" className="hover:text-emerald-400 transition-colors">
                  Latest Articles
                </Link>
              </li>
              <li>
                <Link href="/topics" className="hover:text-emerald-400 transition-colors">
                  Popular Topics
                </Link>
              </li>
              <li>
                <Link href="/authors" className="hover:text-emerald-400 transition-colors">
                  Top Authors
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 2: For Authors */}
          <div className="space-y-3 font-sans text-sm">
            <h3 className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              For Authors
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/studio/articles/new" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <span>Start Writing</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Pro
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/guidelines" className="hover:text-emerald-400 transition-colors">
                  Author Guidelines
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-emerald-400 transition-colors">
                  Publishing Help
                </Link>
              </li>
              <li>
                <Link href="/guidelines" className="hover:text-emerald-400 transition-colors">
                  Community Rules
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 3: Resources */}
          <div className="space-y-3 font-sans text-sm">
            <h3 className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-emerald-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-emerald-400 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faqs" className="hover:text-emerald-400 transition-colors">
                  FAQs
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 4: Legal */}
          <div className="space-y-3 font-sans text-sm">
            <h3 className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/legal/privacy" className="hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-emerald-400 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/copyright" className="hover:text-emerald-400 transition-colors">
                  Copyright Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Subscription Area */}
        <div className="mt-12 pt-8 border-t border-zinc-800/80 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold">
              <Mail className="w-4 h-4" />
              <span>THE ARCHITECTURAL DISPATCH</span>
            </div>
            <h4 className="text-base font-bold text-zinc-100">
              Weekly distributed systems benchmarks & Go runtime internals
            </h4>
            <p className="text-xs text-zinc-400 font-sans">
              No sponsored fluff. Curated analysis of production outages, database compaction algorithms, and compiler internals delivered every Tuesday.
            </p>
          </div>

          <div className="lg:col-span-6 space-y-2">
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="architect@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                required
                className="bg-zinc-900 border-zinc-800 focus:border-emerald-500 font-mono text-xs h-10 text-zinc-100"
              />
              <Button
                type="submit"
                disabled={status === "loading"}
                className={`font-mono text-xs font-bold h-10 shrink-0 gap-1.5 ${
                  isUnsubscribeMode
                    ? "bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
                    : "bg-emerald-600 hover:bg-emerald-500 text-zinc-950"
                }`}
              >
                <span>{status === "loading" ? "Processing..." : isUnsubscribeMode ? "Unsubscribe" : "Subscribe"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>Zero spam. Unsubscribe at any time.</span>
              <button
                type="button"
                onClick={() => {
                  setIsUnsubscribeMode(!isUnsubscribeMode);
                  setStatus("idle");
                  setFeedbackMessage("");
                }}
                className="text-zinc-400 hover:text-emerald-400 underline transition-colors"
              >
                {isUnsubscribeMode ? "Switch to Subscribe" : "Unsubscribe here"}
              </button>
            </div>

            {/* Newsletter Feedback Messages */}
            {status === "success" && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {status === "error" && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{feedbackMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Footer Copyright & Telemetry Bar */}
      <div className="border-t border-zinc-900 bg-zinc-950/90 py-6 text-xs text-zinc-500 font-mono">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>&copy; {new Date().getFullYear()} WRITNEXA Platform Inc. Production-grade software architecture ecosystem.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-zinc-400 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational</span>
            </span>
            <span>&bull;</span>
            <span>Go 1.23+ &bull; Next.js 16.4</span>
            <span>&bull;</span>
            <span>PostgreSQL 16 &bull; Redis 7</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

