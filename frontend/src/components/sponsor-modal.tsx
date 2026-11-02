"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createAuthorSponsorship } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Coffee,
  Code2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  CreditCard,
  Lock,
} from "lucide-react";

interface SponsorModalProps {
  authorUsername: string;
  authorDisplayName: string;
  articleId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TIERS = [
  { id: "coffee", name: "Coffee & Server Support", amountCents: 500, icon: Coffee, desc: "Sponsor server costs and caffeinated debugging." },
  { id: "code", name: "Code Reviewer Tier", amountCents: 1500, icon: Code2, desc: "Support deep benchmark reproductions & profiling." },
  { id: "patron", name: "Architecture Patron", amountCents: 5000, icon: Sparkles, desc: "Fund comprehensive multi-part engineering papers." },
];

export function SponsorModal({
  authorUsername,
  authorDisplayName,
  articleId,
  isOpen,
  onClose,
  onSuccess,
}: SponsorModalProps) {
  const { user, accessToken } = useAuth();
  const [selectedTier, setSelectedTier] = useState<string>("coffee");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [donorName, setDonorName] = useState<string>(user?.email?.split("@")[0] || "");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const getAmountCents = () => {
    if (selectedTier === "custom") {
      const val = parseFloat(customAmount);
      return isNaN(val) ? 500 : Math.round(val * 100);
    }
    const found = TIERS.find((t) => t.id === selectedTier);
    return found ? found.amountCents : 500;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const amountCents = getAmountCents();
    if (amountCents < 100) {
      setErrorMsg("Minimum sponsorship amount is $1.00");
      setIsSubmitting(false);
      return;
    }

    const currentTier = TIERS.find((t) => t.id === selectedTier)?.name || "Custom Support";

    const res = await createAuthorSponsorship(
      authorUsername,
      {
        amount_cents: amountCents,
        tier_name: currentTier,
        donor_name: isAnonymous ? "Anonymous Engineer" : (donorName || "Developer Supporter"),
        donor_email: user?.email,
        message: message.trim(),
        is_anonymous: isAnonymous,
        article_id: articleId,
      },
      accessToken || undefined
    );

    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(res.error?.message || "Failed to process sponsorship. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl text-zinc-100 space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-100 transition-colors p-1 rounded-lg hover:bg-zinc-800"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
              Sponsorship Confirmed!
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto font-sans leading-relaxed">
              Thank you for supporting <span className="text-zinc-200 font-semibold">{authorDisplayName}</span> (@{authorUsername}) and championing high-fidelity developer publishing.
            </p>
            <div className="pt-4">
              <Button
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs px-6"
              >
                Close & Return
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="space-y-1.5 pr-8">
              <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-semibold uppercase tracking-wider">
                <Heart className="w-4 h-4 fill-rose-500/20 text-rose-500" />
                <span>Developer Sponsorship</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 font-mono">
                Sponsor @{authorUsername}
              </h2>
              <p className="text-xs text-zinc-400 font-sans">
                Directly fund software architecture deep dives, open-source benchmarks, and telemetry toolchains.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Tier Selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400">Select Support Tier</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {TIERS.map((tier) => {
                    const Icon = tier.icon;
                    const isSelected = selectedTier === tier.id;
                    return (
                      <button
                        type="button"
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? "bg-emerald-950/30 border-emerald-500/80 text-zinc-100 shadow-md shadow-emerald-950/30"
                            : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-400" : "text-zinc-500"}`} />
                          <span className={`font-mono font-bold text-sm ${isSelected ? "text-emerald-400" : "text-zinc-300"}`}>
                            ${(tier.amountCents / 100).toFixed(0)}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-zinc-200 line-clamp-1">{tier.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount option */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTier("custom")}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                    selectedTier === "custom"
                      ? "border-emerald-500 bg-emerald-950/40 text-emerald-400 font-semibold"
                      : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Custom Amount
                </button>
                {selectedTier === "custom" && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="font-mono text-xs text-zinc-400">$</span>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 25"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800 w-32"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Supporter Name & Anonymous toggle */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400">Your Public Supporter Name</label>
                  <Input
                    placeholder="e.g. Linus / Senior SRE @ Datadog"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    disabled={isAnonymous}
                    className="h-9 text-xs font-mono bg-zinc-900 border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400">Note for the Author (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Loved the memory alignment diagrams in your Go concurrency deep dive!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs font-mono text-zinc-400">
                    Make this sponsorship anonymous (hides name on public page)
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold font-mono text-xs h-10 gap-2 shadow-lg shadow-emerald-950/40"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Processing Sponsorship..."
                      : `Confirm $${(getAmountCents() / 100).toFixed(2)} Sponsorship`}
                  </span>
                </Button>
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-500 mt-2.5">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Zero platform cut • 100% routed directly to author</span>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

