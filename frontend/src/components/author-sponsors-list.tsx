"use client";

import React, { useEffect, useState } from "react";
import { fetchAuthorSponsorships, AuthorSponsorshipsData } from "@/lib/api";
import { SponsorModal } from "./sponsor-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Sparkles, Coffee, ShieldCheck, MessageSquare } from "lucide-react";

interface AuthorSponsorsListProps {
  authorUsername: string;
  authorDisplayName: string;
}

export function AuthorSponsorsList({
  authorUsername,
  authorDisplayName,
}: AuthorSponsorsListProps) {
  const [data, setData] = useState<AuthorSponsorshipsData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSponsors = async () => {
    setIsLoading(true);
    const res = await fetchAuthorSponsorships(authorUsername);
    if (res.success && res.data) {
      setData(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadSponsors();
  }, [authorUsername]);

  const totalRaised = data?.total_raised_cents ? (data.total_raised_cents / 100).toFixed(0) : "0";

  return (
    <>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-semibold uppercase tracking-wider">
              <Heart className="w-4 h-4 fill-rose-500/20 text-rose-500" />
              <span>Creator Sponsorships</span>
            </div>
            <h3 className="text-xl font-bold font-mono tracking-tight text-zinc-100">
              Backing & Engineering Patrons
            </h3>
            <p className="text-xs text-zinc-400 font-sans">
              Support @{authorUsername}&apos;s architectural essays, open-source benchmarks, and telemetry toolchains.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {data && data.total_sponsors > 0 && (
              <Badge variant="outline" className="font-mono text-xs border-emerald-800/60 text-emerald-400 h-8 px-3">
                ${totalRaised} Raised • {data.total_sponsors} {data.total_sponsors === 1 ? "Sponsor" : "Sponsors"}
              </Badge>
            )}
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs h-8 gap-1.5 shadow-md shadow-emerald-950/40"
            >
              <Heart className="w-3.5 h-3.5 fill-zinc-950" />
              <span>Sponsor Author</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center font-mono text-xs text-zinc-500">
            Loading developer sponsorships...
          </div>
        ) : !data || data.sponsorships.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-zinc-800/80 text-zinc-500 font-mono text-xs space-y-3">
            <p>Be the first engineer to sponsor @{authorUsername}&apos;s technical publishing.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="font-mono text-xs border-zinc-800 text-zinc-300 hover:text-emerald-400"
            >
              Become a Patron
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {data.sponsorships.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 space-y-2 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {s.donor_name}
                    </p>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge className="bg-emerald-950/50 text-emerald-400 border border-emerald-800/60 text-[10px] font-mono shrink-0">
                    ${(s.amount_cents / 100).toFixed(0)} • {s.tier_name}
                  </Badge>
                </div>

                {s.message && (
                  <p className="text-xs text-zinc-400 font-sans italic line-clamp-2">
                    &ldquo;{s.message}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <SponsorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        authorUsername={authorUsername}
        authorDisplayName={authorDisplayName}
        onSuccess={loadSponsors}
      />
    </>
  );
}

