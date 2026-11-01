"use client";

import React from "react";
import { Building, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPublicationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 space-y-1">
        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
          <Building className="w-4 h-4" />
          <span>organizations // publications_registry</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-100">
          Publications Management
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Review community publications, engineering collective blogs, and manage organization verification.
        </p>
      </div>

      <div className="text-center py-16 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
          <Building className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="text-base font-bold text-zinc-200">
            Publications Registry Active
          </h3>
          <p className="text-xs text-zinc-500 font-sans leading-relaxed">
            All user publications inherit collective author permissions. Verified badges and publication-level domain routing can be monitored here.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="font-mono text-xs border-zinc-800">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            <span>All Organizations Active</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

