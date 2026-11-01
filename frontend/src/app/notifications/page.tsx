"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  InAppNotificationItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  Heart,
  MessageSquare,
  UserPlus,
  ArrowLeft,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  const loadNotifications = useCallback(
    async (p: number) => {
      if (!accessToken) return;
      setIsLoading(true);
      const res = await fetchNotifications(accessToken, p, 20);
      setIsLoading(false);
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        if (res.data.meta?.unread_count !== undefined) {
          setUnreadCount(res.data.meta.unread_count);
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?return_to=/notifications");
      return;
    }
    if (accessToken) {
      loadNotifications(page);
    }
  }, [authLoading, user, accessToken, page, loadNotifications, router]);

  const handleMarkAllRead = async () => {
    if (!accessToken || isMarkingAll) return;
    setIsMarkingAll(true);
    const res = await markAllNotificationsRead(accessToken);
    setIsMarkingAll(false);
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  const handleItemClick = async (notif: InAppNotificationItem) => {
    if (!accessToken) return;
    if (!notif.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationRead(accessToken, notif.id);
    }

    if (notif.action_url) {
      router.push(notif.action_url);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_follower":
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case "new_comment":
      case "new_reply":
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case "article_liked":
        return <Heart className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  if (authLoading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-16 space-y-4">
        <div className="w-48 h-8 rounded bg-zinc-900 animate-pulse" />
        <div className="w-full h-40 rounded bg-zinc-900/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Back navigation */}
      <div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Explorer</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Bell className="w-4 h-4" />
            <span>in_app_telemetry // notification_center</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-zinc-100">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-600 text-zinc-950 font-mono text-xs font-bold">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-400 font-sans">
            Stay updated with comments, mentions, new followers, and publication reactions.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mark all read</span>
          </Button>
        )}
      </div>

      {/* Notification Stream */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 animate-pulse space-y-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800" />
                <div className="w-48 h-4 rounded bg-zinc-800" />
              </div>
              <div className="w-full h-8 rounded bg-zinc-800/60" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <Bell className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-200">
              All caught up!
            </h3>
            <p className="text-sm text-zinc-500 font-sans max-w-sm mx-auto">
              You do not have any new notifications at the moment. Interactions on your articles will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleItemClick(notif)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                notif.is_read
                  ? "border-zinc-800/70 bg-zinc-900/20 hover:bg-zinc-900/40 opacity-80"
                  : "border-zinc-700 bg-zinc-900/70 hover:bg-zinc-900 shadow-sm"
              }`}
            >
              {/* Type Icon Badge */}
              <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 mt-0.5">
                {getNotificationIcon(notif.type)}
              </div>

              {/* Notification Body */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-zinc-200">
                      {notif.actor_display_name || notif.actor_username || "Someone"}
                    </span>
                    <span className="text-zinc-500 font-mono text-[11px]">
                      @{notif.actor_username}
                    </span>
                    {!notif.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                    {new Date(notif.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="text-sm font-sans text-zinc-300 leading-snug">
                  {notif.message}
                </p>

                {notif.action_url && (
                  <div className="pt-1 flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <span>View details</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

