import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, BookOpen, PenTool, Shield, ExternalLink } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "QUORIX — Developer Publishing & Technical Knowledge Ecosystem",
  description:
    "A production-grade technical publishing ecosystem for software engineers, systems architects, and open-source contributors.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        {/* Sleek Developer Header */}
        <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono font-bold text-emerald-400 group-hover:border-emerald-500 transition-colors">
                  Q/
                </div>
                <span className="font-mono font-bold tracking-tight text-lg text-zinc-100">
                  QUORIX
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  v1.0-alpha
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-zinc-400">
                <Link
                  href="/"
                  className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explorer</span>
                </Link>
                <Link
                  href="/studio"
                  className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Author Studio</span>
                </Link>
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Center</span>
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>API :8080</span>
              </div>
              <a
                href="http://localhost:8080/health"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 transition-colors"
              >
                <span>Health Check</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Technical Footer */}
        <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 text-xs text-zinc-500 font-mono">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span>QUORIX Platform — Go Modular Monolith + Next.js App Router</span>
            </div>
            <div className="flex items-center gap-6">
              <span>PostgreSQL 16 (pgx + sqlc)</span>
              <span>Redis 7</span>
              <span>Goose Migrations</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
