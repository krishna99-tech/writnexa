"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import { Terminal, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth-split-layout";

export default function RegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredDevToken, setRegisteredDevToken] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isLoading && user) {
      router.push(user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard");
    }
  }, [isLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username,
          display_name: displayName || username,
          password,
        }),
      });

      const data: ApiResponse<{ verification_token?: string }> = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Registration failed. Please check your inputs.");
        if (data.error?.details) {
          const map: Record<string, string> = {};
          data.error.details.forEach((d) => (map[d.field] = d.issue));
          setFieldErrors(map);
        }
        setIsSubmitting(false);
        return;
      }

      // If registered successfully in dev mode, we can show verification shortcut or redirect
      if (data.data?.verification_token) {
        setRegisteredDevToken(data.data.verification_token);
      } else {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      setError(err?.message || "Could not connect to authentication service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      pageType="register"
      title="Join the Developer Ecosystem"
      description="Create your WRITNEXA developer account to publish architecture essays, curate reading lists, bookmark algorithms, and engage in high-signal technical discussions."
      badge="Developer Community"
      quote={{
        text: "Sharing our multi-region replication postmortem on WRITNEXA connected us with leading distributed systems engineers.",
        author: "Devon Zhang",
        role: "Principal Architect",
      }}
    >
      <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Terminal className="w-4 h-4" />
            <span>developer_registration // auth.writnexa.dev</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">
            Create Developer Account
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            One unified account for reading, publishing technical insights, and platform participation.
          </CardDescription>
        </CardHeader>

        {registeredDevToken ? (
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Account Created Successfully!</span>
              </div>
              <p className="text-xs text-zinc-300">
                A verification link has been prepared for <strong className="font-mono">{email}</strong>.
              </p>
              <div className="mt-3 p-2 bg-zinc-950 rounded border border-zinc-800 font-mono text-xs break-all text-zinc-400">
                Token: <span className="text-emerald-400">{registeredDevToken}</span>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
              onClick={() => router.push(`/verify-email?token=${registeredDevToken}&email=${encodeURIComponent(email)}`)}
            >
              <span>Proceed to Verify Email</span>
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
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="developer@writnexa.dev"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {fieldErrors.email && (
                  <p className="text-xs text-rose-400">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Handle / Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">@</span>
                  <Input
                    id="username"
                    type="text"
                    placeholder="linus_t"
                    className="pl-7"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    required
                  />
                </div>
                {fieldErrors.username && (
                  <p className="text-xs text-rose-400">{fieldErrors.username}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Linus Torvalds"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password (Argon2id)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-[11px] text-zinc-500 font-mono">
                  Minimum 8 characters with secure entropy.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t border-zinc-800/60 pt-4">
              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Creating Account..."
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
              >
                Register Account
              </Button>

              <div className="text-xs text-zinc-400 text-center font-mono">
                Already registered?{" "}
                <Link href="/login" className="text-emerald-400 hover:underline">
                  Sign in here
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </AuthSplitLayout>
  );
}

