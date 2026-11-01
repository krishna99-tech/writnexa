"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { BookOpen, PenTool, Shield, User, LogOut, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function Navbar() {
  const { user, profile, logout, isLoading } = useAuth();

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
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
