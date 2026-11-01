"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import { Terminal, AlertCircle, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return_to") || "/";

  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Captures HTTP-only refresh cookie
        body: JSON.stringify({ email, password }),
      });

      const data: ApiResponse<{
        access_token: string;
        user: any;
        profile: any;
      }> = await res.json();

      if (!res.ok || !data.success || !data.data) {
        setError(data.error?.message || "Invalid email or password.");
        setIsSubmitting(false);
        return;
      }

      setSession(data.data.access_token, data.data.user, data.data.profile);
      router.push(returnTo);
    } catch (err: any) {
      setError(err?.message || "Failed to connect to authentication server.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur shadow-2xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Terminal className="w-4 h-4" />
          <span>session_authenticate // quorix.io</span>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
          Sign In
        </CardTitle>
        <CardDescription className="text-zinc-400 text-sm">
          Access your author drafts, personalized feed, and engineering bookmarks.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="developer@quorix.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-emerald-400 hover:underline font-mono"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {isSubmitting ? (
              "Authenticating..."
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          <div className="text-xs text-zinc-400 text-center font-mono">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-emerald-400 hover:underline">
              Register now
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="container max-w-md mx-auto py-16 px-4">
      <Suspense fallback={<div className="text-center font-mono text-zinc-500">Loading form...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
