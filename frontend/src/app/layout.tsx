import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";
import { AdPlacement } from "@/components/ad-placement";
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
        <AuthProvider>
          {/* Sleek Developer Header with Session Context */}
          <Navbar />

          {/* Main Content */}
          <main className="flex-1">{children}</main>

          {/* Technical Footer */}
          <footer className="border-t border-zinc-800/80 bg-zinc-950 py-8 text-xs text-zinc-500 font-mono">
            <div className="container mx-auto px-4 space-y-6">
              {/* Global Footer Advertisement Banner */}
              <AdPlacement slotKey="footer_banner" className="max-w-5xl mx-auto" />

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-900">
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
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
