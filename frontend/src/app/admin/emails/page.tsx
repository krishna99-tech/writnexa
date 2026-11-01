"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, AlertTriangle, Send, RefreshCw, Server } from "lucide-react";

export default function AdminEmailsPage() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-2">
            <Mail className="w-6 h-6 text-amber-400" />
            <span>Platform Email & Delivery Telemetry</span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Monitor transactional email delivery (verification, password resets, notifications) and newsletter subscribers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/40 border-zinc-800/80 p-5">
          <span className="text-xs font-mono text-zinc-400 block">SMTP Gateway</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-2 block">Connected</span>
          <p className="text-[11px] font-mono text-zinc-500 mt-1">Mock / MailHog / AWS SES Relay</p>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800/80 p-5">
          <span className="text-xs font-mono text-zinc-400 block">Transactional Delivery</span>
          <span className="text-xl font-bold font-mono text-zinc-100 mt-2 block">100%</span>
          <p className="text-[11px] font-mono text-zinc-500 mt-1">Zero dropped delivery jobs</p>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800/80 p-5">
          <span className="text-xs font-mono text-zinc-400 block">Newsletter Subscriptions</span>
          <span className="text-xl font-bold font-mono text-zinc-100 mt-2 block">Active</span>
          <p className="text-[11px] font-mono text-zinc-500 mt-1">Automated unsubscribe support</p>
        </Card>
      </div>
    </div>
  );
}

