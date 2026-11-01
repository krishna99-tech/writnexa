"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  fetchAdminAdPlacements,
  updateAdminAdPlacement,
  fetchAdminAdCampaigns,
  createAdminAdCampaign,
  updateAdminAdCampaign,
  deleteAdminAdCampaign,
  fetchAdminAdAnalytics,
  fetchAdminAdErrors,
  recordAdminProviderRevenue,
  AdPlacementItem,
  AdCampaignItem,
  AdAnalyticsResult,
  AdErrorLogItem,
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Megaphone,
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Eye,
  MousePointerClick,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Pause,
  Play,
  Trash2,
  Calendar,
  Layers,
  Settings,
} from "lucide-react";

export default function AdminAdsPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"placements" | "campaigns" | "settlements" | "errors">("placements");
  const [selectedRange, setSelectedRange] = useState<string>("30d");

  // Data states
  const [placements, setPlacements] = useState<AdPlacementItem[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaignItem[]>([]);
  const [analytics, setAnalytics] = useState<AdAnalyticsResult | null>(null);
  const [errorsList, setErrorsList] = useState<AdErrorLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Campaign Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [campName, setCampName] = useState("");
  const [campAdvertiser, setCampAdvertiser] = useState("");
  const [campSponsorLabel, setCampSponsorLabel] = useState("Sponsored by ");
  const [campHeadline, setCampHeadline] = useState("");
  const [campBody, setCampBody] = useState("");
  const [campCta, setCampCta] = useState("Learn More");
  const [campTargetUrl, setCampTargetUrl] = useState("https://");
  const [campImageUrl, setCampImageUrl] = useState("");
  const [campCpm, setCampCpm] = useState("3.00");
  const [campCpc, setCampCpc] = useState("0.50");

  // Provider Settlement Modal
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settleProvider, setSettleProvider] = useState("adsense");
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split("T")[0]);
  const [settleImpressions, setSettleImpressions] = useState("10000");
  const [settleClicks, setSettleClicks] = useState("150");
  const [settleRevenue, setSettleRevenue] = useState("35.00");

  const loadAll = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);

    const [placeRes, campRes, analyticsRes, errRes] = await Promise.all([
      fetchAdminAdPlacements(accessToken),
      fetchAdminAdCampaigns(accessToken),
      fetchAdminAdAnalytics(accessToken, { range: selectedRange }),
      fetchAdminAdErrors(accessToken, { limit: 20 }),
    ]);

    setIsLoading(false);

    if (placeRes.success && placeRes.data?.placements) {
      setPlacements(placeRes.data.placements);
    }
    if (campRes.success && campRes.data?.campaigns) {
      setCampaigns(campRes.data.campaigns);
    }
    if (analyticsRes.success && analyticsRes.data?.analytics) {
      setAnalytics(analyticsRes.data.analytics);
    }
    if (errRes.success && errRes.data?.errors) {
      setErrorsList(errRes.data.errors);
    }
  }, [accessToken, selectedRange]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Toggle placement active status
  const handleTogglePlacement = async (p: AdPlacementItem) => {
    if (!accessToken) return;
    const res = await updateAdminAdPlacement(accessToken, p.id, {
      name: p.name,
      provider: p.provider,
      is_enabled: !p.is_enabled,
      format: p.format,
      frequency_cap: p.frequency_cap,
      config: p.config,
    });
    if (res.success && res.data?.placement) {
      setPlacements((prev) =>
        prev.map((item) => (item.id === p.id ? res.data!.placement : item))
      );
    }
  };

  // Change placement provider
  const handleChangeProvider = async (p: AdPlacementItem, newProvider: string) => {
    if (!accessToken) return;
    const res = await updateAdminAdPlacement(accessToken, p.id, {
      name: p.name,
      provider: newProvider,
      is_enabled: p.is_enabled,
      format: p.format,
      frequency_cap: p.frequency_cap,
      config: p.config,
    });
    if (res.success && res.data?.placement) {
      setPlacements((prev) =>
        prev.map((item) => (item.id === p.id ? res.data!.placement : item))
      );
    }
  };

  // Toggle campaign status (active <-> paused)
  const handleToggleCampaignStatus = async (c: AdCampaignItem) => {
    if (!accessToken) return;
    const nextStatus = c.status === "active" ? "paused" : "active";
    const res = await updateAdminAdCampaign(accessToken, c.id, {
      name: c.name,
      advertiser: c.advertiser,
      sponsor_label: c.sponsor_label,
      headline: c.headline,
      body: c.body,
      cta_text: c.cta_text,
      target_url: c.target_url,
      image_url: c.image_url,
      format: c.format,
      placements: c.placements,
      status: nextStatus,
      cpm: c.cpm,
      cpc: c.cpc,
      start_date: c.start_date,
      end_date: c.end_date,
    });
    if (res.success && res.data?.campaign) {
      setCampaigns((prev) =>
        prev.map((item) => (item.id === c.id ? res.data!.campaign : item))
      );
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (id: string) => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to permanently delete this direct campaign?")) return;
    const res = await deleteAdminAdCampaign(accessToken, id);
    if (res.success) {
      setCampaigns((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Create Campaign Submit
  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const res = await createAdminAdCampaign(accessToken, {
      name: campName,
      advertiser: campAdvertiser,
      sponsor_label: campSponsorLabel,
      headline: campHeadline,
      body: campBody,
      cta_text: campCta,
      target_url: campTargetUrl,
      image_url: campImageUrl,
      format: "native",
      placements: [],
      status: "active",
      cpm: parseFloat(campCpm) || 0,
      cpc: parseFloat(campCpc) || 0,
      start_date: new Date().toISOString(),
      end_date: null,
    });

    if (res.success && res.data?.campaign) {
      setCampaigns((prev) => [res.data!.campaign, ...prev]);
      setShowCreateModal(false);
      // reset form
      setCampName("");
      setCampAdvertiser("");
      setCampHeadline("");
      setCampBody("");
    }
  };

  // Record Provider Revenue Submit
  const handleSettlementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const res = await recordAdminProviderRevenue(accessToken, {
      provider: settleProvider,
      date: settleDate,
      reported_impressions: parseInt(settleImpressions, 10) || 0,
      reported_clicks: parseInt(settleClicks, 10) || 0,
      reported_revenue: parseFloat(settleRevenue) || 0,
      currency: "USD",
    });

    if (res.success) {
      setShowSettlementModal(false);
      loadAll();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Megaphone className="w-4 h-4" />
            <span>executive_intelligence // advertisement_governance</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100">
            Advertisement Management
          </h1>
          <p className="text-sm text-zinc-400 font-sans">
            Modular multi-provider advertising system, Google AdSense configuration, direct sponsorship campaigns, and transparent revenue telemetry.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono">
          {[
            { label: "24h", value: "24h" },
            { label: "7d", value: "7d" },
            { label: "30d", value: "30d" },
            { label: "90d", value: "90d" },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setSelectedRange(r.value)}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                selectedRange === r.value
                  ? "bg-emerald-600 text-zinc-950 font-bold"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Impressions */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>IMPRESSIONS</span>
              <Eye className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {analytics?.total_impressions.toLocaleString() || "0"}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Unique viewport exposures
            </div>
          </CardContent>
        </Card>

        {/* Clicks */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>VERIFIED CLICKS</span>
              <MousePointerClick className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {analytics?.total_clicks.toLocaleString() || "0"}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Deduplicated reader interactions
            </div>
          </CardContent>
        </Card>

        {/* CTR */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>CLICK-THROUGH RATE</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {analytics?.ctr_percentage.toFixed(2) || "0.00"}%
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Overall network CTR
            </div>
          </CardContent>
        </Card>

        {/* Internal Estimated Direct Revenue */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>ESTIMATED DIRECT REV</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              ${analytics?.estimated_direct_revenue.toFixed(2) || "0.00"}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Internal CPM / CPC direct contracts
            </div>
          </CardContent>
        </Card>

        {/* Third-Party Provider Reported Revenue */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
              <span>PROVIDER-REPORTED REV</span>
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-sky-400">
              ${analytics?.provider_reported_revenue.toFixed(2) || "0.00"}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">
              Verified AdSense / third-party reports
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 font-mono text-xs">
        <button
          onClick={() => setActiveTab("placements")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "placements"
              ? "bg-zinc-800 text-emerald-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          Placements Configuration ({placements.length})
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "campaigns"
              ? "bg-zinc-800 text-emerald-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          Direct Campaigns ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveTab("settlements")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "settlements"
              ? "bg-zinc-800 text-emerald-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          Provider Settlements & Revenue
        </button>

        <button
          onClick={() => setActiveTab("errors")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === "errors"
              ? "bg-zinc-800 text-emerald-400 font-bold"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          Error Telemetry ({errorsList.length})
        </button>
      </div>

      {/* Tab 1: Placements Configuration */}
      {activeTab === "placements" && (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Configured Ad Slots</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Manage provider routing, enable/disable ad units by page, and tune frequency limits.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAll}
              className="text-xs font-mono border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Placement Slot</th>
                  <th className="py-3 px-4">Target Page</th>
                  <th className="py-3 px-4">Active Provider</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                {placements.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">{p.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">slot: {p.slot_key}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300 capitalize">{p.page_type}</td>
                    <td className="py-3 px-4">
                      <select
                        value={p.provider}
                        onChange={(e) => handleChangeProvider(p, e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="direct">Direct Sponsor</option>
                        <option value="adsense">Google AdSense</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 uppercase">
                        {p.format}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          p.is_enabled
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {p.is_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePlacement(p)}
                        className={`h-7 px-3 text-xs font-mono ${
                          p.is_enabled
                            ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        {p.is_enabled ? "Disable" : "Enable"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Direct Campaigns */}
      {activeTab === "campaigns" && (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Direct Sponsorship Campaigns</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans">
                Curate FTC-compliant direct developer tool campaigns with custom sponsor badging and CPM/CPC pricing.
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Campaign & Sponsor</th>
                  <th className="py-3 px-4">Headline</th>
                  <th className="py-3 px-4">CPM / CPC</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">{c.name}</div>
                      <div className="text-[10px] text-zinc-400 font-sans">
                        {c.sponsor_label} &bull; {c.advertiser}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-zinc-300 line-clamp-1">{c.headline}</div>
                      <a
                        href={c.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                      >
                        <span className="truncate">{c.target_url}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      <div>${c.cpm.toFixed(2)} CPM</div>
                      <div className="text-[10px] text-zinc-500">${c.cpc.toFixed(2)} CPC</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCampaignStatus(c)}
                          className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
                          title={c.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                        >
                          {c.status === "active" ? (
                            <Pause className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCampaign(c.id)}
                          className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Delete Campaign"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Provider Settlements & Revenue */}
      {activeTab === "settlements" && (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Third-Party Revenue Transparency & Verification</span>
              </h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-2xl">
                QUORIX strictly distinguishes <strong>internal contract estimates</strong> (calculated via direct campaign CPM/CPC formulas) from <strong>third-party provider-reported revenues</strong> (such as verified Google AdSense payment statements). Fabricating metrics or conflating estimates is strictly prohibited.
              </p>
            </div>
            <Button
              onClick={() => setShowSettlementModal(true)}
              className="bg-sky-600 hover:bg-sky-500 text-zinc-950 font-bold font-mono text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Settlement</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3">
              <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide">
                Direct Sold Campaigns (Internal Estimates)
              </div>
              <div className="text-3xl font-extrabold font-mono text-zinc-100">
                ${analytics?.estimated_direct_revenue.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                Computed dynamically from recorded unique impressions and verified reader clicks against contracted sponsor CPM/CPC rates.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3">
              <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wide">
                Google AdSense & Networks (Provider Reported)
              </div>
              <div className="text-3xl font-extrabold font-mono text-zinc-100">
                ${analytics?.provider_reported_revenue.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                Verified net revenue reported directly by external advertising partners through monthly settlement statements or APIs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Error Telemetry */}
      {activeTab === "errors" && (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-6">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Ad Load & Provider Error Logs</span>
            </h3>
            <p className="text-xs text-zinc-400 font-sans">
              Real-time telemetry capturing client ad-blocker filtering, script load exceptions, and provider API warnings.
            </p>
          </div>

          {errorsList.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500 py-8 text-center">
              No advertising errors or script exceptions recorded.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Error Code</th>
                    <th className="py-3 px-4">Placement</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Error Message</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                  {errorsList.map((err) => (
                    <tr key={err.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-rose-400">{err.error_code}</td>
                      <td className="py-3 px-4 text-zinc-300">{err.placement_key}</td>
                      <td className="py-3 px-4 uppercase text-zinc-400">{err.provider}</td>
                      <td className="py-3 px-4 max-w-sm truncate text-zinc-400 font-sans">
                        {err.error_message}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-500">
                        {new Date(err.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Direct Campaign */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Create Direct Campaign</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-sm"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-3 font-sans text-xs">
              <div>
                <label className="block text-zinc-400 font-mono mb-1">Campaign Internal Name</label>
                <Input
                  required
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="e.g. Neon Serverless Postgres Spring Launch"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">Advertiser Entity</label>
                  <Input
                    required
                    value={campAdvertiser}
                    onChange={(e) => setCampAdvertiser(e.target.value)}
                    placeholder="Neon Inc."
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">Sponsor Badge Label</label>
                  <Input
                    required
                    value={campSponsorLabel}
                    onChange={(e) => setCampSponsorLabel(e.target.value)}
                    placeholder="Sponsored by Neon"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">Headline</label>
                <Input
                  required
                  value={campHeadline}
                  onChange={(e) => setCampHeadline(e.target.value)}
                  placeholder="Deploy Serverless Postgres in Milliseconds"
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">Description / Body</label>
                <textarea
                  required
                  rows={2}
                  value={campBody}
                  onChange={(e) => setCampBody(e.target.value)}
                  placeholder="Scale down to zero, branch databases like git, and build faster with serverless PostgreSQL."
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">CTA Button Text</label>
                  <Input
                    required
                    value={campCta}
                    onChange={(e) => setCampCta(e.target.value)}
                    placeholder="Try Neon Free"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">Destination URL</label>
                  <Input
                    required
                    value={campTargetUrl}
                    onChange={(e) => setCampTargetUrl(e.target.value)}
                    placeholder="https://neon.tech/?ref=quorix"
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">Creative Image URL (Optional)</label>
                <Input
                  value={campImageUrl}
                  onChange={(e) => setCampImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">CPM Rate ($ per 1k views)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={campCpm}
                    onChange={(e) => setCampCpm(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">CPC Rate ($ per click)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={campCpc}
                    onChange={(e) => setCampCpc(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono"
                >
                  Publish Campaign
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Provider Settlement */}
      {showSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Record Provider Settlement</span>
              </h3>
              <button
                onClick={() => setShowSettlementModal(false)}
                className="text-zinc-500 hover:text-zinc-300 font-mono text-sm"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSettlementSubmit} className="space-y-3 font-sans text-xs">
              <div>
                <label className="block text-zinc-400 font-mono mb-1">Provider Network</label>
                <select
                  value={settleProvider}
                  onChange={(e) => setSettleProvider(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="adsense">Google AdSense</option>
                  <option value="direct_wire">Direct Wire Transfer</option>
                  <option value="other">Other Network</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">Settlement Date</label>
                <Input
                  type="date"
                  required
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">Reported Impressions</label>
                  <Input
                    type="number"
                    required
                    value={settleImpressions}
                    onChange={(e) => setSettleImpressions(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">Reported Clicks</label>
                  <Input
                    type="number"
                    required
                    value={settleClicks}
                    onChange={(e) => setSettleClicks(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">Net Verified Revenue (USD)</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={settleRevenue}
                  onChange={(e) => setSettleRevenue(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-zinc-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSettlementModal(false)}
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-500 text-zinc-950 font-bold font-mono"
                >
                  Save Settlement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
