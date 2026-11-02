"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchUnreadNotificationCount } from "@/lib/api";
import {
  BookOpen,
  PenTool,
  Shield,
  User,
  LogOut,
  Settings,
  Bell,
  Bookmark,
  Rss,
  Search,
  LayoutDashboard,
  ArrowRight,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { WritnexaLogo } from "./writnexa-logo";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, logout, isLoading, accessToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // 1. Hide public navbar on Workspace (/dashboard), Studio (/studio), Admin (/admin), and Settings (/settings)
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings")
  ) {
    return null;
  }

  // 2. Auth pages use dedicated self-contained AuthSplitLayout (Login, Register, Forgot Password, etc.)
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

  return <PublicNavbar user={user} profile={profile} logout={logout} isLoading={isLoading} accessToken={accessToken} />;
}

function PublicNavbar({
  user,
  profile,
  logout,
  isLoading,
  accessToken,
}: {
  user: any;
  profile: any;
  logout: () => void;
  isLoading: boolean;
  accessToken: string | null;
}) {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accessToken) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadNotificationCount(accessToken).then((res) => {
      if (res.success && res.data) {
        setUnreadCount(res.data.unread_count || 0);
      }
    });

    const interval = setInterval(() => {
      fetchUnreadNotificationCount(accessToken).then((res) => {
        if (res.success && res.data) {
          setUnreadCount(res.data.unread_count || 0);
        }
      });
    }, 45000);

    return () => clearInterval(interval);
  }, [accessToken]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <WritnexaLogo variant="full" size="sm" href="/" showVersion />

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-zinc-400">
            <Link
              href="/explore"
              className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore</span>
            </Link>
            {user && (
              <Link
                href="/feed/following"
                className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors text-emerald-400/90 hover:text-emerald-300"
              >
                <Rss className="w-3.5 h-3.5" />
                <span>Following</span>
              </Link>
            )}
            <Link
              href="/topics"
              className="hover:text-zinc-100 transition-colors"
            >
              <span>Topics</span>
            </Link>
            <Link
              href="/authors"
              className="hover:text-zinc-100 transition-colors"
            >
              <span>Authors</span>
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors text-emerald-400 font-medium"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Workspace</span>
              </Link>
            )}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-medium">Admin Center</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search Shortcut */}
          <Link href="/search">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 font-mono text-xs"
              title="Search WRITNEXA"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </Link>

          {/* Theme Quick Toggle (Light / Dark) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </Button>

          {isLoading ? (
            <div className="w-20 h-8 rounded bg-zinc-900 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notification Bell Icon */}
              <Link href="/notifications">
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                  )}
                </Button>
              </Link>

              {/* Bookmarks Icon */}
              <Link href="/library/bookmarks">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-amber-400 hover:bg-zinc-900"
                  title="Saved Bookmarks"
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
              </Link>

              <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
                <span className="text-zinc-400">@{profile?.username}</span>
                <Badge
                  variant={
                    user.role === "admin" || user.role === "super_admin"
                      ? "default"
                      : "secondary"
                  }
                  className="capitalize text-[10px]"
                >
                  {user.role}
                </Badge>
              </div>

              <Link href="/studio/articles/new">
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1.5 font-mono text-xs shadow-sm"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Write</span>
                </Button>
              </Link>

              <Link href="/dashboard/settings" className="hidden md:inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="hidden md:inline-flex h-8 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30"
              >
                <LogOut className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="h-8 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
                >
                  Register
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 ml-1"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800/80 bg-zinc-950/98 backdrop-blur-xl px-4 py-4 space-y-4 font-mono text-xs shadow-2xl animate-in slide-in-from-top-2 duration-200">
          {user && (
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <WritnexaLogo variant="icon" size="xs" />
                <span className="text-zinc-300 font-semibold">@{profile?.username}</span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-zinc-700 text-emerald-400">
                {user.role}
              </Badge>
            </div>
          )}

          <nav className="space-y-1">
            <Link
              href="/explore"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Explore Knowledge</span>
            </Link>

            {user && (
              <Link
                href="/feed/following"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
              >
                <Rss className="w-4 h-4 text-emerald-400" />
                <span>Following Feed</span>
              </Link>
            )}

            <Link
              href="/topics"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <span className="w-4 text-center font-bold text-zinc-500">#</span>
              <span>All Topics</span>
            </Link>

            <Link
              href="/authors"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <User className="w-4 h-4 text-zinc-500" />
              <span>Authors Directory</span>
            </Link>

            {user && (
              <>
                <div className="pt-2 pb-1 border-t border-zinc-800/60 text-[10px] uppercase tracking-wider text-zinc-500">
                  Creator & Account
                </div>

                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-emerald-400 font-semibold hover:bg-zinc-900 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Author Workspace</span>
                </Link>

                <Link
                  href="/library/bookmarks"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
                >
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>Saved Bookmarks</span>
                </Link>

                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
                >
                  <Settings className="w-4 h-4 text-zinc-400" />
                  <span>Settings & Profile</span>
                </Link>

                {(user.role === "admin" || user.role === "super_admin") && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-amber-400 font-semibold hover:bg-zinc-900 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Admin Center</span>
                  </Link>
                )}

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between px-3 py-1 text-zinc-400">
                  <span className="flex items-center gap-2">
                    {resolvedTheme === "dark" ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <span>Theme: {resolvedTheme === "dark" ? "Dark" : "Light"}</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="h-7 text-xs font-mono border-zinc-800"
                  >
                    Switch
                  </Button>
                </div>

                <div className="pt-2 border-t border-zinc-800/60">
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/20 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}

            {!user && (
              <div className="pt-3 border-t border-zinc-800/60 flex flex-col gap-2">
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full h-9 border-zinc-800 text-zinc-300 font-mono text-xs">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="w-full">
                  <Button className="w-full h-9 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs">
                    Register Free Account
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

