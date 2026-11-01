"use client";

import React, { useEffect } from "react";
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
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Authors", href: "/admin/authors", icon: FileText },
  { label: "Articles", href: "/admin/articles", icon: BookOpen },
  { label: "Publications", href: "/admin/publications", icon: Building },
  { label: "Moderation Queue", href: "/admin/moderation", icon: AlertTriangle },
  { label: "Audit Trail", href: "/admin/audit-logs", icon: History },
  { label: "Platform Settings", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading } = useAuth();

  const isAuthorized =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "moderator";

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
          You do not have administrative privileges to access the QUORIX Super Admin Center.
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row border-t border-zinc-800/80">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 border-r border-zinc-800/80 p-5 space-y-6 shrink-0 bg-zinc-950/40">
        <div className="space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to App</span>
          </Link>
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
          {NAV_ITEMS.map((item) => {
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
      <main className="flex-1 p-6 sm:p-10 min-w-0 max-w-7xl mx-auto space-y-8">
        {children}
      </main>
    </div>
  );
}

