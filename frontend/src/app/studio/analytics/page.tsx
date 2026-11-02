"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudioAnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/analytics");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono text-xs text-zinc-500">
      Navigating to Author Analytics...
    </div>
  );
}
