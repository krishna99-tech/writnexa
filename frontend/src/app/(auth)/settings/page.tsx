"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import {
  User,
  Shield,
  Key,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface SessionItem {
  id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  is_current?: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, accessToken, isLoading, logout } = useAuth();

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingSessions(true);
    setSessionsError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/sessions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const data: ApiResponse<SessionItem[]> = await res.json();
      if (res.ok && data.success && data.data) {
        setSessions(data.data);
      } else {
        setSessionsError(data.error?.message || "Failed to load active sessions.");
      }
    } catch {
      setSessionsError("Could not reach session management API.");
    } finally {
      setIsLoadingSessions(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?return_to=/settings");
      return;
    }
    if (accessToken) {
      fetchSessions();
    }
  }, [isLoading, user, accessToken, router, fetchSessions]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    setIsChangingPw(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data: ApiResponse = await res.json();
      if (!res.ok || !data.success) {
        setPwError(data.error?.message || "Password change failed. Check your current password.");
      } else {
        setPwSuccess("Password successfully updated! All other sessions have been terminated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchSessions();
      }
    } catch (err: any) {
      setPwError(err?.message || "Error communicating with server.");
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to terminate this session?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: ApiResponse = await res.json();
      if (res.ok && data.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        alert(data.error?.message || "Could not terminate session.");
      }
    } catch {
      alert("Network error terminating session.");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="container max-w-4xl mx-auto py-16 px-4 text-center font-mono text-zinc-500">
        Loading account settings...
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
          Account Settings
        </h1>
        <p className="text-sm text-zinc-400 mt-1 font-mono">
          Security controls, credential rotation, and session management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile / Account Overview */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                <CardTitle className="text-base text-zinc-100">Identity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-zinc-500 block">Username</span>
                <span className="text-zinc-200 font-semibold">@{profile?.username}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Display Name</span>
                <span className="text-zinc-200">{profile?.display_name}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Email Address</span>
                <span className="text-zinc-200">{user.email}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Email Verification</span>
                {user.email_verified ? (
                  <span className="text-emerald-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Pending Verification
                  </span>
                )}
              </div>
              <div>
                <span className="text-zinc-500 block">Role & Privileges</span>
                <Badge variant="outline" className="mt-1 uppercase text-[10px] border-zinc-700">
                  {user.role}
                </Badge>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">UUID</span>
                <span className="text-zinc-400 text-[10px] break-all">{user.id}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Controls */}
        <div className="md:col-span-2 space-y-6">
          {/* Change Password Form */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                <CardTitle className="text-lg text-zinc-100">Change Password</CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Update your password. Changing your password will invalidate all existing sessions.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                {pwSuccess && (
                  <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pwSuccess}</span>
                  </div>
                )}
                {pwError && (
                  <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pwError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
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
                  <p className="text-[11px] text-zinc-500 font-mono">Minimum 8 characters.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
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

              <CardFooter className="border-t border-zinc-800/60 pt-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={isChangingPw}
                  className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold"
                >
                  {isChangingPw ? "Updating..." : "Update Password"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Active Sessions */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-emerald-400" />
                  <CardTitle className="text-lg text-zinc-100">Active Sessions</CardTitle>
                </div>
                <CardDescription className="text-xs text-zinc-400 mt-1">
                  Active login sessions authenticated via rotating refresh tokens stored in PostgreSQL.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSessions}
                disabled={isLoadingSessions}
                className="h-8 text-zinc-400 hover:text-zinc-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>

            <CardContent>
              {sessionsError && (
                <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs mb-3 font-mono">
                  {sessionsError}
                </div>
              )}

              {sessions.length === 0 ? (
                <p className="text-xs font-mono text-zinc-500 py-4 text-center">
                  No active session records found.
                </p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-4 font-mono text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-200">
                            {sess.ip_address || "Unknown IP"}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Logged in: {new Date(sess.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-[11px] truncate max-w-sm">
                          {sess.user_agent || "Standard HTTP Client"}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(sess.id)}
                        className="text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 h-8 px-2"
                        title="Revoke Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

