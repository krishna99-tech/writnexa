import React from "react";
import Link from "next/link";
import { Mail, MessageSquare, Terminal, Github, Twitter, MapPin } from "lucide-react";

export const metadata = {
  title: "Contact & Platform Support — WRITNEXA",
  description: "Get in touch with the WRITNEXA infrastructure and engineering support team.",
};

export default function ContactPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-16 space-y-12">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>CONTACT & ENGINEERING SUPPORT</span>
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-100">
          Get in Touch with Platform Engineering
        </h1>
        <p className="text-sm text-zinc-400 font-sans leading-relaxed">
          Have an architecture question, security vulnerability disclosure, or partnership inquiry? Reach out through our direct engineering channels.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Mail className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Direct Email</h3>
          <p className="text-xs text-zinc-400">
            For general platform inquiries, author verification, and support:
          </p>
          <a
            href="mailto:support@writnexa.dev"
            className="text-xs font-mono text-emerald-400 hover:underline block pt-1"
          >
            support@writnexa.dev
          </a>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Community Discussions</h3>
          <p className="text-xs text-zinc-400">
            Engage with verified authors and contributors in technical comments:
          </p>
          <Link
            href="/explore"
            className="text-xs font-mono text-emerald-400 hover:underline block pt-1"
          >
            Explore Discussions &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <Github className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">GitHub Issues</h3>
          <p className="text-xs text-zinc-400">
            Report bugs, documentation improvements, and platform feature requests:
          </p>
          <a
            href="https://github.com/writnexa-platform"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-emerald-400 hover:underline block pt-1"
          >
            github.com/writnexa-platform &rarr;
          </a>
        </div>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <MapPin className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-zinc-100 text-base">Security & Vulnerability Disclosure</h3>
          <p className="text-xs text-zinc-400">
            Found a potential security issue? We operate a responsible disclosure program:
          </p>
          <a
            href="mailto:security@writnexa.dev"
            className="text-xs font-mono text-emerald-400 hover:underline block pt-1"
          >
            security@writnexa.dev
          </a>
        </div>
      </div>
    </div>
  );
}

