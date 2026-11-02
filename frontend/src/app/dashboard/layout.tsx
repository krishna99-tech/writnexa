"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WritnexaLogo } from "@/components/writnexa-logo";
import {
  LayoutDashboard,
  FileText,
  PenSquare,
  BarChart3,
  User,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  Search,
  ExternalLink,
  Sparkles,
  DollarSign,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Articles & Drafts", href: "/dashboard/articles", icon: FileText },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Monetization & Payouts", href: "/dashboard/monetization", icon: DollarSign },
  { label: "Author Profile", href: "/dashboard/profile", icon: User },
  { label: "Account Settings", href: "/dashboard/settings", icon: Settings },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Auth Protection: Workspace requires active author or admin authentication
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/login?return_to=${encodeURIComponent(pathname)}`);
      } else if (
        user.role === "user" &&
        !pathname.startsWith("/dashboard/profile") &&
        !pathname.startsWith("/dashboard/settings")
      ) {
        router.push(`/become-author?return_to=${encodeURIComponent(pathname)}`);
      }
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono text-zinc-500">
        <div className="flex flex-col items-center gap-3">
          <WritnexaLogo variant="icon" size="lg" className="animate-pulse" />
          <span>Loading WRITNEXA Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-4 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <WritnexaLogo variant="full" size="sm" href="/dashboard" />
          <Badge variant="outline" className="text-[10px] border-emerald-800 text-emerald-400">
            Workspace
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/studio/articles/new">
            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1 px-2.5">
              <PenSquare className="w-3.5 h-3.5" />
              <span>Write</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-8 w-8 p-0 text-zinc-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Workspace Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 z-30 inset-y-0 left-0 w-64 border-r border-zinc-800/80 bg-zinc-950 p-5 flex flex-col justify-between shrink-0 transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Workspace Brand */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <WritnexaLogo variant="full" size="md" href="/dashboard" showVersion />
            </div>

            {/* User Quick Info */}
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-mono text-sm font-semibold shrink-0">
                {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-200 truncate">
                  {profile?.display_name || user.email.split("@")[0]}
                </p>
                <p className="text-[11px] font-mono text-zinc-500 truncate">
                  @{profile?.username || "author"}
                </p>
              </div>
              <Badge variant="secondary" className="text-[9px] uppercase px-1 py-0 shrink-0">
                {user.role}
              </Badge>
            </div>
          </div>

          {/* New Article Action */}
          <Link href="/studio/articles/new" className="block">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs shadow-sm h-9">
              <PenSquare className="w-4 h-4" />
              <span>New Article</span>
            </Button>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                    active
                      ? "bg-emerald-950/40 text-emerald-400 font-semibold border border-emerald-800/60"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Workspace Footer Actions */}
        <div className="space-y-2 pt-6 border-t border-zinc-800/80 font-mono text-xs">
          {/* Admin link if user is admin */}
          {(user?.role === "admin" || user?.role === "super_admin") && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-amber-400 hover:bg-amber-950/20 transition-colors"
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Admin Center</span>
            </Link>
          )}

          {/* Return to Public Platform */}
          <Link
            href="/explore"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>Explore Public</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-zinc-600" />
          </Link>

          {/* Sign Out */}
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/20 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Workspace Top Bar (Desktop) */}
        <header className="hidden md:flex h-14 border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur px-8 items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span className="text-zinc-400">Workspace</span>
            <span>/</span>
            <span className="text-zinc-200 capitalize">
              {pathname === "/dashboard"
                ? "Overview"
                : pathname.split("/").filter(Boolean).pop()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/search">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 font-mono text-xs text-zinc-400 hover:text-zinc-100">
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </Button>
            </Link>
            <Link href="/studio/articles/new">
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1.5 font-mono text-xs">
                <PenSquare className="w-3.5 h-3.5" />
                <span>Write</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Content Page Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

