"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PenTool,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Github,
  FileCode,
  ShieldCheck,
  Check,
  BookOpen,
} from "lucide-react";

export default function BecomeAuthorPage() {
  const router = useRouter();
  const { user, profile, accessToken, isLoading, setSession } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login?return_to=/become-author");
        return;
      }
      if (user.role === "author" || user.role === "admin" || user.role === "super_admin") {
        setSuccessMsg("You already have author permissions! Redirecting to your workspace...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
      }
    }
  }, [isLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    if (!agreedToGuidelines) {
      setErrorMsg("Please accept the technical author guidelines to continue.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/become-author`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          display_name: displayName.trim() || profile?.display_name,
          headline: headline.trim(),
          bio: bio.trim(),
          github_url: githubUrl.trim(),
        }),
      });

      const data: ApiResponse<{
        access_token: string;
        user: any;
        profile: any;
      }> = await res.json();

      if (!res.ok || !data.success || !data.data) {
        setErrorMsg(data.error?.message || "Failed to activate author permissions.");
        setIsSubmitting(false);
        return;
      }

      // Update in-memory auth state with upgraded token & role
      setSession(data.data.access_token, data.data.user, data.data.profile);
      setSuccessMsg("Author status activated! Redirecting to Author Workspace...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error communicating with server.");
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="container max-w-xl mx-auto py-24 px-4 text-center font-mono text-zinc-500">
        Loading author onboarding...
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/30">
          <PenTool className="w-6 h-6" />
        </div>
        <Badge variant="outline" className="border-emerald-800 text-emerald-400 font-mono text-xs">
          Author Onboarding
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 font-mono">
          Become a WRITNEXA Author
        </h1>
        <p className="text-sm text-zinc-400 font-sans max-w-md mx-auto">
          Share your systems architecture essays, compiler research, and open-source breakthroughs with engineers worldwide.
        </p>
      </div>

      {/* Status Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Guidelines Card */}
      <Card className="bg-zinc-900/30 border-zinc-800/80 p-5 space-y-3">
        <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Author Privileges & Standards</span>
        </h3>
        <ul className="text-xs text-zinc-300 space-y-2 font-mono">
          <li className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Full Markdown + LaTeX Math + Syntax Highlighting editor.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Draft scheduling, canonical URL control, and reading telemetry.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>High-quality technical rigor — no AI spam or unverified claims.</span>
          </li>
        </ul>
      </Card>

      {/* Onboarding Form */}
      <Card className="bg-zinc-900/40 border-zinc-800/80">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-mono text-base text-zinc-100">Author Credentials</CardTitle>
            <CardDescription className="text-xs text-zinc-400 font-mono">
              Complete your technical profile to activate author access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={profile?.display_name || "Linus Torvalds"}
                className="bg-zinc-950 border-zinc-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400">Professional Headline</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Distributed Systems Engineer | Go & Rust"
                className="bg-zinc-950 border-zinc-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400">Bio & Topics of Interest</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="What topics will you write about? (e.g., Raft consensus, eBPF networking, compiler optimizations)..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Profile URL</span>
              </Label>
              <Input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="bg-zinc-950 border-zinc-800 text-xs font-mono"
              />
            </div>

            {/* Checkbox agreement */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToGuidelines}
                  onChange={(e) => setAgreedToGuidelines(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 mt-0.5"
                />
                <span className="text-xs font-mono text-zinc-300">
                  I agree to the WRITNEXA technical publishing guidelines, terms of service, and commit to publishing original, verifiable engineering work.
                </span>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/60 pt-4">
            <Link
              href="/explore"
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300"
            >
              Cancel & Return
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !agreedToGuidelines}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs shadow-sm h-9 px-6"
            >
              <span>{isSubmitting ? "Activating Author..." : "Activate Author Access"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

