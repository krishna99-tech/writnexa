"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SettingsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    if (tab === "profile") {
      router.replace("/dashboard/profile");
    } else if (tab === "bookmarks") {
      router.replace("/library/bookmarks");
    } else if (tab === "network") {
      router.replace("/feed/following");
    } else {
      router.replace("/dashboard/settings");
    }
  }, [tab, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center font-mono text-xs text-zinc-500 gap-2">
      <div className="w-6 h-6 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-emerald-400 animate-pulse text-[10px]">
        Q/
      </div>
      <span>Navigating to Workspace Settings...</span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center font-mono text-zinc-500">Loading...</div>}>
      <SettingsRedirectContent />
    </Suspense>
  );
}
