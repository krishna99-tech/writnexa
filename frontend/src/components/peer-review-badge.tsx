"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPeerReviews, PeerReviewItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, CheckCircle2, Cpu, UserCheck } from "lucide-react";

interface PeerReviewBadgeProps {
  articleSlug: string;
}

export function PeerReviewBadge({ articleSlug }: PeerReviewBadgeProps) {
  const [reviews, setReviews] = useState<PeerReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetchPeerReviews(articleSlug);
      if (res.success && res.data?.reviews) {
        setReviews(res.data.reviews);
      }
      setIsLoading(false);
    }
    load();
  }, [articleSlug]);

  if (isLoading || reviews.length === 0) return null;

  const review = reviews[0];

  return (
    <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-4 sm:p-5 space-y-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold text-xs uppercase tracking-wider text-emerald-400">
            Architecture Guild Peer Review
          </span>
        </div>

        {review.code_benchmarks_verified && (
          <Badge className="bg-emerald-900/50 text-emerald-300 border border-emerald-700/60 font-mono text-[10px] gap-1 self-start sm:self-auto">
            <Cpu className="w-3 h-3" />
            <span>Code Benchmarks Verified</span>
          </Badge>
        )}
      </div>

      <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed italic">
        &ldquo;{review.verdict_summary}&rdquo;
      </p>

      <div className="pt-2 border-t border-emerald-900/40 flex items-center justify-between text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          {review.reviewer_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={review.reviewer_avatar_url}
              alt={review.reviewer_name}
              className="w-5 h-5 rounded-full object-cover border border-emerald-700"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-emerald-700 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
              {review.reviewer_name[0]}
            </div>
          )}
          <span>
            Reviewed by{" "}
            <Link
              href={`/author/${review.reviewer_username}`}
              className="text-emerald-400 font-semibold hover:underline"
            >
              {review.reviewer_name}
            </Link>{" "}
            (@{review.reviewer_username})
          </span>
        </div>
        <span className="text-[11px] text-zinc-500 hidden sm:inline">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

