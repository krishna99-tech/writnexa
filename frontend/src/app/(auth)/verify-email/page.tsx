"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import { Terminal, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [resendEmail, setResendEmail] = useState(emailFromUrl);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleVerify = useCallback(async (tokenToVerify: string) => {
    if (!tokenToVerify) return;
    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToVerify.trim() }),
      });

      const data: ApiResponse = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || "Verification failed. The token may be invalid or expired.");
        setIsSuccess(false);
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to reach verification endpoint.");
    } finally {
      setIsVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (tokenFromUrl) {
      handleVerify(tokenFromUrl);
    }
  }, [tokenFromUrl, handleVerify]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    setResendMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });
      const data: ApiResponse<{ token?: string }> = await res.json();
      if (res.ok && data.success) {
        if (data.data?.token) {
          setResendMessage(`New verification dispatched! Dev token: ${data.data.token}`);
          setToken(data.data.token);
        } else {
          setResendMessage("Verification email dispatched. Please check your inbox.");
        }
      } else {
        setResendMessage(data.error?.message || "Could not dispatch verification.");
      }
    } catch {
      setResendMessage("Network error dispatching verification.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur shadow-2xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Terminal className="w-4 h-4" />
          <span>email_verification // auth.quorix.io</span>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
          Verify Email Address
        </CardTitle>
        <CardDescription className="text-zinc-400 text-sm">
          Confirm your developer email to publish articles, comment, and engage with the community.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isSuccess ? (
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Email Verified Successfully!</span>
            </div>
            <p className="text-xs text-zinc-300">
              Your account is now fully active. You have full authoring and reading privileges.
            </p>
            <Link href="/login">
              <Button className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold">
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="token">Verification Token</Label>
              <Input
                id="token"
                type="text"
                placeholder="Paste your 64-character token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <Button
              onClick={() => handleVerify(token)}
              disabled={isVerifying || !token}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Token...</span>
                </span>
              ) : (
                "Verify Token"
              )}
            </Button>

            {/* Resend Verification Form */}
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <p className="text-xs font-mono text-zinc-400">
                Need a new verification link?
              </p>
              <form onSubmit={handleResend} className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter your registered email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="font-mono text-xs"
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isResending || !resendEmail}
                  className="w-full border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                >
                  {isResending ? "Dispatching..." : "Resend Verification Email"}
                </Button>
              </form>
              {resendMessage && (
                <p className="text-xs font-mono text-emerald-400 p-2 rounded bg-zinc-950 border border-zinc-800 break-all">
                  {resendMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t border-zinc-800/60 pt-4 flex justify-center">
        <Link href="/login" className="text-xs text-zinc-400 hover:text-zinc-200 font-mono">
          Return to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="container max-w-md mx-auto py-16 px-4">
      <Suspense fallback={<div className="text-center font-mono text-zinc-500">Loading verification...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
