"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function Navbar() {
  const { user, profile, logout, isLoading, accessToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

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
            <Link
              href="/studio"
              className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
            >
              <PenTool className="w-4 h-4" />
              <span>Author Studio</span>
            </Link>
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

        <div className="flex items-center gap-3">
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

              <Link href="/settings">
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
                className="h-8 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30"
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
        </div>
      </div>
    </header>
  );
}

