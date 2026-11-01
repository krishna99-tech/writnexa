"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import { Terminal, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth-split-layout";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data: ApiResponse<{ token?: string }> = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || "Failed to process password reset request.");
      } else {
        setSuccess(true);
        if (data.data?.token) {
          setDevToken(data.data.token);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Could not reach password recovery service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      pageType="forgot-password"
      title="Recover Your Credentials"
      description="Enter your registered developer email address. We'll issue a cryptographically signed, single-use reset token valid for 15 minutes."
      badge="Credential Recovery"
      quote={{
        text: "Zero-knowledge secret recovery with cryptographic nonces ensures our platform members are completely shielded from credential stuffing attacks.",
        author: "Security Operations",
        role: "QUORIX Core Team",
      }}
    >
      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Terminal className="w-4 h-4" />
            <span>password_recovery // auth.quorix.io</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Enter your account email to receive a single-use password reset link.
          </CardDescription>
        </CardHeader>

        {success ? (
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Recovery Request Dispatched</span>
              </div>
              <p className="text-xs text-zinc-300">
                If the email <strong className="font-mono">{email}</strong> exists in our database, instructions to reset your password have been sent.
              </p>
              {devToken && (
                <div className="mt-3 p-2 bg-zinc-950 rounded border border-zinc-800 font-mono text-xs break-all text-zinc-400">
                  Dev Token: <span className="text-emerald-400">{devToken}</span>
                </div>
              )}
            </div>

            {devToken && (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
                onClick={() => router.push(`/reset-password?token=${devToken}`)}
              >
                <span>Continue to Reset Form</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Registered Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="developer@quorix.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t border-zinc-800/60 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
              >
                {isSubmitting ? "Dispatching..." : "Send Reset Link"}
              </Button>

              <div className="text-xs text-zinc-400 text-center font-mono">
                Remember your password?{" "}
                <Link href="/login" className="text-emerald-400 hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </AuthSplitLayout>
  );
}

