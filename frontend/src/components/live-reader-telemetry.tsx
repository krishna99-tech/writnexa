"use client";

import React, { useEffect, useState } from "react";
import { sendReadingHeartbeat, fetchLiveTelemetry } from "@/lib/api";
import { Activity, Users, Radio } from "lucide-react";

interface LiveReaderTelemetryProps {
  articleSlug: string;
}

export function LiveReaderTelemetry({ articleSlug }: LiveReaderTelemetryProps) {
  const [activeReaders, setActiveReaders] = useState<number>(1);
  const [scrollDepth, setScrollDepth] = useState<number>(0);

  useEffect(() => {
    // Generate or retrieve anonymous stable visitor hash for this browser
    let visitorHash = localStorage.getItem("writnexa_visitor_hash");
    if (!visitorHash) {
      visitorHash = "v_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("writnexa_visitor_hash", visitorHash);
    }

    // Scroll depth tracking
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollHeight > 0) {
        const depth = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
        setScrollDepth(depth);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial heartbeat
    sendReadingHeartbeat(articleSlug, visitorHash, 0);

    // Initial telemetry fetch
    const updateTelemetry = async () => {
      const res = await fetchLiveTelemetry(articleSlug);
      if (res.success && res.data) {
        setActiveReaders(Math.max(1, res.data.active_readers_now));
      }
    };
    updateTelemetry();

    // Recurring heartbeat interval (every 25 seconds)
    const heartbeatInterval = setInterval(() => {
      sendReadingHeartbeat(articleSlug, visitorHash, scrollDepth);
    }, 25000);

    // Recurring telemetry update (every 15 seconds)
    const telemetryInterval = setInterval(updateTelemetry, 15000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearInterval(heartbeatInterval);
      clearInterval(telemetryInterval);
    };
  }, [articleSlug, scrollDepth]);

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 font-mono text-[11px] text-zinc-400 select-none">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="font-semibold text-zinc-200">
        {activeReaders} {activeReaders === 1 ? "engineer" : "engineers"}
      </span>
      <span className="text-zinc-500 hidden sm:inline">reading now</span>
    </div>
  );
}

