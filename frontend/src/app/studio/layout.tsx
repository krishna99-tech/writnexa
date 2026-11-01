"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  FileText,
  PenSquare,
  BarChart3,
  User,
  Settings,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?return_to=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-24 px-4 text-center font-mono text-zinc-500">
        Loading Author Studio...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navLinks = [
    {
      href: "/studio",
      label: "Overview",
      icon: LayoutDashboard,
      active: pathname === "/studio",
    },
    {
      href: "/studio/articles",
      label: "Articles",
      icon: FileText,
      active: pathname === "/studio/articles" || (pathname.startsWith("/studio/articles") && pathname !== "/studio/articles/new"),
    },
    {
      href: "/studio/analytics",
      label: "Analytics",
      icon: BarChart3,
      active: pathname === "/studio/analytics",
    },
    {
      href: "/studio/articles/new",
      label: "Write Article",
      icon: PenSquare,
      active: pathname === "/studio/articles/new",
    },
  ];

  const isEditor =
    pathname === "/studio/articles/new" ||
    (pathname.startsWith("/studio/articles/") && pathname.endsWith("/edit"));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Studio Header Sub-bar (hidden inside focused article editor) */}
      {!isEditor && (
        <header className="border-b border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-30">
          <div className="container max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-mono font-bold text-sm tracking-wider uppercase text-zinc-200">
                  Author Studio
                </span>
              </div>

              <nav className="flex items-center gap-1 font-mono text-xs">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                        link.active
                          ? "bg-zinc-800 text-emerald-400 font-semibold"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              {profile?.username && (
                <Link
                  href={`/author/${profile.username}`}
                  target="_blank"
                  className="flex items-center gap-1 text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  <span>View Public Profile</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              )}
              <div className="w-[1px] h-3.5 bg-zinc-800" />
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Main Studio Viewport */}
      <main className={isEditor ? "flex-1 flex flex-col w-full" : "flex-1 container max-w-7xl mx-auto px-4 py-8"}>
        {children}
      </main>
    </div>
  );
}

