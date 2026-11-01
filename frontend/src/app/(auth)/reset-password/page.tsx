"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import { Terminal, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") || "";

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token.trim()) {
      setError("Reset token is required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          new_password: newPassword,
        }),
      });

      const data: ApiResponse = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || "Failed to reset password. Token may be expired.");
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || "Network error resetting password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur shadow-2xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Terminal className="w-4 h-4" />
          <span>set_new_password // auth.quorix.io</span>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
          Reset Password
        </CardTitle>
        <CardDescription className="text-zinc-400 text-sm">
          Set a new strong Argon2id hashed password for your account.
        </CardDescription>
      </CardHeader>

      {success ? (
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Password Changed Successfully!</span>
            </div>
            <p className="text-xs text-zinc-300">
              All active sessions have been revoked. Please sign in with your new credentials.
            </p>
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
            onClick={() => router.push("/login")}
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
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
              <Label htmlFor="token">Recovery Token</Label>
              <Input
                id="token"
                type="text"
                placeholder="64-character reset token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isSubmitting ? "Resetting Password..." : "Update Password"}
            </Button>

            <div className="text-xs text-zinc-400 text-center font-mono">
              <Link href="/login" className="text-emerald-400 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container max-w-md mx-auto py-16 px-4">
      <Suspense fallback={<div className="text-center font-mono text-zinc-500">Loading form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
