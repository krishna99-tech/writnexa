"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudioOverviewRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono text-xs text-zinc-500">
      Navigating to Workspace...
    </div>
  );
}
