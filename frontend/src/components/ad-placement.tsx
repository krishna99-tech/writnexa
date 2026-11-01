"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  fetchAdPlacement,
  recordAdImpression,
  recordAdClick,
  recordAdError,
  AdPlacementResponse,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles, AlertCircle } from "lucide-react";

interface AdPlacementProps {
  slotKey: string;
  className?: string;
  minHeight?: number;
}

export function AdPlacement({ slotKey, className = "", minHeight }: AdPlacementProps) {
  const [placement, setPlacement] = useState<AdPlacementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasImpressed, setHasImpressed] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPlacement() {
      try {
        const res = await fetchAdPlacement(slotKey);
        if (!isMounted) return;
        setIsLoading(false);
        if (res.success && res.data?.placement) {
          setPlacement(res.data.placement);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsLoading(false);
        recordAdError({
          placement_key: slotKey,
          provider: "unknown",
          error_code: "FETCH_EXCEPTION",
          error_message: err?.message || "Failed to load placement",
          url: typeof window !== "undefined" ? window.location.href : "",
        });
      }
    }

    loadPlacement();
    return () => {
      isMounted = false;
    };
  }, [slotKey]);

  // Viewport Impression Observer
  useEffect(() => {
    if (!placement || !placement.is_enabled || !placement.payload || hasImpressed) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasImpressed) {
            setHasImpressed(true);
            recordAdImpression({
              placement_id: placement.placement_id,
              campaign_id: placement.payload?.campaign_id,
              provider: placement.payload?.provider || "direct",
              path: typeof window !== "undefined" ? window.location.pathname : "/",
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, [placement, hasImpressed]);

  // AdSense script initializer
  useEffect(() => {
    if (placement?.provider === "adsense" && placement.payload?.adsense_client_id) {
      try {
        if (typeof window !== "undefined") {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      } catch (err: any) {
        recordAdError({
          placement_key: slotKey,
          provider: "adsense",
          error_code: "ADSENSE_PUSH_ERROR",
          error_message: err?.message || "adsbygoogle push failed",
          url: typeof window !== "undefined" ? window.location.href : "",
        });
      }
    }
  }, [placement, slotKey]);

  if (isLoading || !placement || !placement.is_enabled || !placement.payload) {
    return null;
  }

  const { payload } = placement;

  // Handle direct campaign click
  const handleDirectClick = (e: React.MouseEvent) => {
    if (payload.target_url) {
      recordAdClick({
        placement_id: placement.placement_id,
        campaign_id: payload.campaign_id,
        provider: "direct",
        target_url: payload.target_url,
      });
    }
  };

  // Google AdSense Provider Rendering
  if (placement.provider === "adsense") {
    return (
      <div
        ref={adRef}
        className={`w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3 text-center ${className}`}
        style={{ minHeight: minHeight || 90 }}
      >
        <div className="flex items-center justify-between pb-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider border-b border-zinc-800/40 mb-2">
          <span>Advertisement</span>
          {payload.is_test_mode && (
            <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400 bg-amber-500/10">
              AdSense Test Mode (data-ad-test=on)
            </Badge>
          )}
        </div>

        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={payload.adsense_client_id}
          data-ad-slot={payload.adsense_slot_id}
          data-ad-format="auto"
          data-full-width-responsive="true"
          data-ad-test={payload.is_test_mode ? "on" : undefined}
        />
      </div>
    );
  }

  // Direct Sponsor Provider Rendering (Dignified Developer Sponsorship)
  if (placement.provider === "direct" && payload.headline) {
    const isSidebar = placement.format === "sidebar";

    return (
      <div
        ref={adRef}
        className={`group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-4 transition-all hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-950/20 ${className}`}
      >
        {/* Top Header Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 uppercase tracking-wide flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>{payload.sponsor_label || "Sponsored"}</span>
          </Badge>
          <span className="text-[10px] font-mono text-zinc-500">
            Developer Ecosystem Partner
          </span>
        </div>

        {/* Content Body */}
        <div className={`flex ${isSidebar ? "flex-col" : "flex-col sm:flex-row"} gap-4 items-start`}>
          {payload.image_url && (
            <div className={`shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 ${isSidebar ? "w-full h-32" : "w-full sm:w-36 h-24"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payload.image_url}
                alt={payload.headline}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-2">
              {payload.headline}
            </h4>
            <p className="text-xs text-zinc-400 line-clamp-3 font-sans leading-relaxed">
              {payload.body}
            </p>

            <div className="pt-2 flex items-center justify-between">
              <a
                href={payload.target_url}
                target="_blank"
                rel="noopener sponsored"
                onClick={handleDirectClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs transition-colors"
              >
                <span>{payload.cta_text || "Learn More"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <span className="text-[10px] font-mono text-zinc-500">
                FTC Compliant Ad
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
