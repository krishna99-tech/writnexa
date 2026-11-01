"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { toggleFollowAuthor, fetchInteractionStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  targetUsername: string;
  targetAuthorId?: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  onFollowChange?: (isFollowing: boolean, count: number) => void;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary";
}

export function FollowButton({
  targetUsername,
  targetAuthorId,
  initialIsFollowing = false,
  initialFollowerCount = 0,
  onFollowChange,
  className = "",
  size = "sm",
  variant,
}: FollowButtonProps) {
  const router = useRouter();
  const { user, profile, accessToken } = useAuth();

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isLoading, setIsLoading] = useState(false);

  // If viewing one's own profile, hide follow button
  const isSelf = profile?.username?.toLowerCase() === targetUsername.toLowerCase();

  const handleToggleFollow = async () => {
    if (!user || !accessToken) {
      router.push(`/login?return_to=/author/${encodeURIComponent(targetUsername)}`);
      return;
    }
    if (isSelf || isLoading) return;

    // Optimistic toggle
    const prevFollowing = isFollowing;
    const prevCount = followerCount;
    const nextFollowing = !prevFollowing;
    const nextCount = prevFollowing ? Math.max(0, prevCount - 1) : prevCount + 1;

    setIsFollowing(nextFollowing);
    setFollowerCount(nextCount);
    if (onFollowChange) onFollowChange(nextFollowing, nextCount);

    setIsLoading(true);
    const res = await toggleFollowAuthor(accessToken, targetUsername);
    setIsLoading(false);

    if (res.success && res.data) {
      setIsFollowing(res.data.following);
      setFollowerCount(res.data.follower_count);
      if (onFollowChange) {
        onFollowChange(res.data.following, res.data.follower_count);
      }
    } else {
      // Revert on error
      setIsFollowing(prevFollowing);
      setFollowerCount(prevCount);
      if (onFollowChange) onFollowChange(prevFollowing, prevCount);
    }
  };

  if (isSelf) {
    return null;
  }

  return (
    <Button
      size={size}
      variant={variant || (isFollowing ? "outline" : "default")}
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={`font-mono text-xs gap-1.5 transition-all ${
        isFollowing
          ? "border-emerald-700 bg-emerald-950/30 text-emerald-300 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-700"
          : "bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
      } ${className}`}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          <span>Follow Author</span>
        </>
      )}
    </Button>
  );
}

