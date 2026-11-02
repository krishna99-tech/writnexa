"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Users,
  BookOpen,
  FileText,
  AlertTriangle,
  Settings,
  History,
  LayoutDashboard,
  ArrowLeft,
  Lock,
  Building,
  BarChart3,
  Megaphone,
  Activity,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "System Operations", href: "/admin/operations", icon: Activity },
  { label: "Platform Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Advertisements", href: "/admin/ads", icon: Megaphone },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Authors", href: "/admin/authors", icon: FileText },
  { label: "Articles", href: "/admin/articles", icon: BookOpen },
  { label: "Publications", href: "/admin/publications", icon: Building },
  { label: "Moderation Queue", href: "/admin/moderation", icon: AlertTriangle },
  { label: "Reports", href: "/admin/reports", icon: AlertTriangle },
  { label: "Audit Trail", href: "/admin/audit-logs", icon: History },
  { label: "Platform Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Role authorization:
  // - Admin and Super Admin have access to the entire admin center.
  // - Moderators only have access to moderation queue and reports.
  // - Authors and regular users are denied access.
  const isModerator = user?.role === "moderator";
  const isModAllowedRoute =
    pathname.startsWith("/admin/moderation") ||
    pathname.startsWith("/admin/reports");

  const isAuthorized =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    (isModerator && isModAllowedRoute);

  const visibleNavItems = isModerator
    ? NAV_ITEMS.filter((item) => item.href === "/admin/moderation" || item.href === "/admin/reports")
    : NAV_ITEMS;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?return_to=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-20">
        <div className="w-48 h-8 rounded bg-zinc-900 animate-pulse mb-6" />
        <div className="w-full h-96 rounded-2xl bg-zinc-900/40 animate-pulse" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-100">
          Access Restricted
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          You do not have administrative privileges to access the WRITNEXA Super Admin Center.
        </p>
        <Link href="/">
          <Button variant="outline" className="font-mono text-xs border-zinc-800">
            Return to Homepage
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur px-4 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-mono font-bold text-sm tracking-tight">Admin Center</span>
          </Link>
          <Badge
            variant={user?.role === "super_admin" ? "default" : "secondary"}
            className="text-[10px] font-mono capitalize py-0"
          >
            {user?.role}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100"
            aria-label="Toggle admin navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Admin Sidebar (Slide-in Drawer on mobile, Fixed Sidebar on desktop) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 md:static md:w-64 border-r border-zinc-800/80 p-5 space-y-6 shrink-0 bg-zinc-950 md:bg-zinc-950/40 transition-transform duration-200 overflow-y-auto ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to App</span>
            </Link>
            {/* Close button inside mobile drawer */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <span className="font-mono font-bold text-sm tracking-tight">
                Admin Center
              </span>
            </div>
            <Badge
              variant={user?.role === "super_admin" ? "default" : "secondary"}
              className="text-[10px] font-mono capitalize py-0"
            >
              {user?.role}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 font-mono">
            @{profile?.username}
          </p>
        </div>

        {/* Sidebar Navigation */}
        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                  active
                    ? "bg-amber-950/30 text-amber-300 font-semibold border border-amber-800/60"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Admin Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl mx-auto space-y-8 w-full">
        {children}
      </main>
    </div>
  );
}

