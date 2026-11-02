"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { fetchAuthorEarnings, AuthorEarningsData } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Heart,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function WorkspaceMonetizationPage() {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<AuthorEarningsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutRequested, setPayoutRequested] = useState(false);

  const loadEarnings = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    const res = await fetchAuthorEarnings(accessToken);
    if (res.success && res.data) {
      setData(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadEarnings();
  }, [accessToken]);

  const balance = data?.balance_cents ? (data.balance_cents / 100).toFixed(2) : "0.00";
  const totalEarned = data?.total_earned_cents ? (data.total_earned_cents / 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <DollarSign className="w-4 h-4" />
            <span>workspace // creator_monetization</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100 font-mono">
            Earnings & Developer Payouts
          </h1>
          <p className="text-sm text-zinc-400 font-sans">
            Direct reader sponsorships, patron pledges, and payout account balances with zero platform revenue cut.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadEarnings}
            disabled={isLoading}
            className="h-8 border-zinc-800 text-zinc-400 hover:text-zinc-100 font-mono text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setPayoutRequested(true)}
            disabled={payoutRequested || !data || data.balance_cents === 0}
            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs gap-1.5 shadow-sm"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{payoutRequested ? "Payout In Transit" : "Transfer Balance"}</span>
          </Button>
        </div>
      </div>

      {payoutRequested && (
        <div className="p-4 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-300 font-mono text-xs flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Payout of ${balance} USD initiated to your verified Stripe Express account. Estimated arrival in 1-2 business days.</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPayoutRequested(false)}
            className="h-7 text-[11px] text-zinc-400 hover:text-zinc-100"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Available Payout Balance</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-zinc-100">
            ${balance}
          </div>
          <p className="text-[11px] font-mono text-emerald-400">
            Available for immediate automated transfer
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Lifetime Developer Earnings</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold font-mono text-zinc-100">
            ${totalEarned}
          </div>
          <p className="text-[11px] font-mono text-zinc-500">
            Across {data?.total_sponsors || 0} sponsorships
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400">Connected Payout Method</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Badge className="bg-emerald-950/60 text-emerald-400 border border-emerald-800 font-mono text-xs">
              Stripe Express Connected
            </Badge>
          </div>
          <p className="text-[11px] font-mono text-zinc-500">
            Automated direct bank deposits enabled
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-mono tracking-tight text-zinc-100">
            Recent Sponsor Transactions & Notes
          </h2>
          <span className="text-xs font-mono text-zinc-500">
            {data?.recent_transactions?.length || 0} Transactions Recorded
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/20 font-mono text-xs text-zinc-500">
            Loading transaction ledger...
          </div>
        ) : !data || data.recent_transactions.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 font-mono text-xs text-zinc-500 space-y-2">
            <p>No sponsorship transactions recorded yet.</p>
            <p className="text-zinc-600">Share your technical essays on Twitter/LinkedIn to attract engineering patrons.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            {data.recent_transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm text-zinc-200">
                      {tx.is_anonymous ? "Anonymous Engineer" : tx.donor_name}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-400">
                      {tx.tier_name}
                    </Badge>
                  </div>
                  {tx.message && (
                    <p className="text-xs text-zinc-400 font-sans italic line-clamp-2">
                      &ldquo;{tx.message}&rdquo;
                    </p>
                  )}
                  <span className="text-[10px] font-mono text-zinc-500 block">
                    {new Date(tx.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-base text-emerald-400">
                    +${(tx.amount_cents / 100).toFixed(2)} {tx.currency}
                  </span>
                  <span className="block text-[10px] font-mono text-zinc-500">
                    Settled • 0% Fee
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

