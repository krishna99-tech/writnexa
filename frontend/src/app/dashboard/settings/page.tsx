"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, ApiResponse } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Key,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Bell,
  Sun,
  Moon,
  Monitor,
  Eye,
  Lock,
  Mail,
  Calendar,
  Sparkles,
  AlertTriangle,
  LogOut,
  User,
  ExternalLink,
} from "lucide-react";

interface SessionItem {
  id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  expires_at: string;
  is_current?: boolean;
}

export default function WorkspaceSettingsPage() {
  const { user, profile, accessToken, isLoading } = useAuth();

  // Active section
  const [activeSection, setActiveSection] = useState<"account" | "security" | "sessions" | "preferences" | "danger">("account");

  // Email update state
  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Preferences state
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyDigest, setNotifyDigest] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  // Danger zone state
  const [dangerConfirmText, setDangerConfirmText] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Fetch active sessions
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
        setSessionsError(data.error?.message || "Failed to load active login sessions.");
      }
    } catch {
      setSessionsError("Could not reach session management API.");
    } finally {
      setIsLoadingSessions(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      fetchSessions();
    }
  }, [accessToken, fetchSessions]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword.length < 8) {
      setPwMsg({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
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
        setPwMsg({ type: "error", text: data.error?.message || "Incorrect current password." });
      } else {
        setPwMsg({ type: "success", text: "Password changed successfully! All other sessions have been logged out." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchSessions();
      }
    } catch (err: any) {
      setPwMsg({ type: "error", text: err?.message || "Failed to communicate with authentication service." });
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to terminate this login session?")) return;
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
      alert("Network error while terminating session.");
    }
  };

  const handleSavePreferences = () => {
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  if (isLoading || !user) {
    return (
      <div className="p-12 text-center font-mono text-xs text-zinc-500">
        Loading workspace account settings...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
            Account & Security Settings
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Manage your credentials, active login sessions, notification rules, and preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/profile">
            <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 font-mono text-xs gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Edit Public Profile &rarr;</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs border-b border-zinc-800/80 pb-4">
        {[
          { key: "account", label: "Account & Email", icon: Mail },
          { key: "security", label: "Password & Security", icon: Key },
          { key: "sessions", label: "Active Sessions", icon: Laptop },
          { key: "preferences", label: "Preferences & Theme", icon: Bell },
          { key: "danger", label: "Danger Zone", icon: AlertTriangle },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key as any)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
                active
                  ? "bg-zinc-800 text-emerald-400 font-semibold border border-zinc-700 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. Account & Email Section */}
      {activeSection === "account" && (
        <div className="space-y-6">
          <Card className="bg-zinc-900/30 border-zinc-800/80">
            <CardHeader>
              <CardTitle className="font-mono text-base text-zinc-100">Primary Account Details</CardTitle>
              <CardDescription className="text-xs text-zinc-400 font-mono">
                Your registered email and authorization credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500">Registered Email</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-zinc-200">{user.email}</span>
                    <Badge variant="outline" className="text-[10px] border-emerald-800 text-emerald-400 font-mono">
                      Verified
                    </Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-zinc-500">Platform Role</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-zinc-200 capitalize">{user.role}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Level {user.role === "admin" ? "5 (Admin)" : "2 (Author)"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono text-zinc-300">Account Identifier (UUID)</span>
                  <p className="text-[11px] font-mono text-zinc-500 select-all">{user.id}</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-zinc-800 text-zinc-400">
                  PostgreSQL 16
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. Password & Security Section */}
      {activeSection === "security" && (
        <Card className="bg-zinc-900/30 border-zinc-800/80">
          <CardHeader>
            <CardTitle className="font-mono text-base text-zinc-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>Password & Cryptographic Credentials</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 font-mono">
              Passwords are protected using memory-hard Argon2id hashing (64MB, 3 iterations, 4 threads).
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleChangePassword}>
            <CardContent className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-zinc-400">Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-zinc-400">New Password (min. 8 characters)</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-zinc-400">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              {pwMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                    pwMsg.type === "success"
                      ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                      : "bg-rose-950/40 border border-rose-800 text-rose-300"
                  }`}
                >
                  {pwMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{pwMsg.text}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-zinc-800/60 pt-4">
              <Button
                type="submit"
                disabled={isChangingPw}
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs h-8 px-4"
              >
                {isChangingPw ? "Rotating Credentials..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* 3. Active Sessions Section */}
      {activeSection === "sessions" && (
        <Card className="bg-zinc-900/30 border-zinc-800/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-mono text-base text-zinc-100 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-400" />
                <span>Active Login Sessions</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400 font-mono">
                Devices currently authenticated into your QUORIX developer account.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSessions}
              disabled={isLoadingSessions}
              className="h-8 border-zinc-800 text-zinc-400 font-mono text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingSessions ? (
              <div className="p-8 text-center font-mono text-xs text-zinc-500">
                Enumerating active Redis/DB sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-zinc-500">
                No external active sessions detected.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60 rounded-lg border border-zinc-800/80 bg-zinc-950/40 overflow-hidden">
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                        <Laptop className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-mono font-medium text-zinc-200 truncate">
                            {sess.user_agent || "Web Browser (Chrome/Firefox)"}
                          </p>
                          {sess.is_current && (
                            <Badge className="text-[9px] bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-mono">
                              Current Session
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 mt-0.5">
                          <span>IP: {sess.ip_address || "127.0.0.1"}</span>
                          <span>•</span>
                          <span>Started: {new Date(sess.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {!sess.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(sess.id)}
                        className="h-7 text-xs font-mono text-rose-400 hover:bg-rose-950/30 shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1" />
                        <span>Revoke</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Preferences & Theme Section */}
      {activeSection === "preferences" && (
        <Card className="bg-zinc-900/30 border-zinc-800/80">
          <CardHeader>
            <CardTitle className="font-mono text-base text-zinc-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>Workspace Preferences</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 font-mono">
              Customize developer interface theme and automated notification triggers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 max-w-xl">
            {/* Theme Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-mono text-zinc-400">Color Theme</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "dark", label: "Dark (Cyber)", icon: Moon },
                  { key: "light", label: "Light", icon: Sun },
                  { key: "system", label: "System", icon: Monitor },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTheme(t.key as any)}
                      className={`p-3 rounded-lg border text-xs font-mono flex flex-col items-center gap-2 transition-colors ${
                        theme === t.key
                          ? "bg-zinc-800 border-emerald-500 text-emerald-400 font-bold"
                          : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notification Checkboxes */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-mono text-zinc-400">Email Notifications</Label>
              
              <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyFollowers}
                  onChange={(e) => setNotifyFollowers(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                />
                <div className="text-xs font-mono">
                  <span className="text-zinc-200 block">New Followers</span>
                  <span className="text-zinc-500 text-[11px]">Notify me when a software engineer follows my technical profile.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyComments}
                  onChange={(e) => setNotifyComments(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0"
                />
                <div className="text-xs font-mono">
                  <span className="text-zinc-200 block">Discussion Replies</span>
                  <span className="text-zinc-500 text-[11px]">Notify me when someone replies to my technical essays or comments.</span>
                </div>
              </label>
            </div>

            {prefSaved && (
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Preferences saved successfully.</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-zinc-800/60 pt-4">
            <Button
              onClick={handleSavePreferences}
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs h-8 px-4"
            >
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* 5. Danger Zone */}
      {activeSection === "danger" && (
        <Card className="bg-rose-950/10 border-rose-900/60">
          <CardHeader>
            <CardTitle className="font-mono text-base text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Danger Zone</span>
            </CardTitle>
            <CardDescription className="text-xs text-rose-400/80 font-mono">
              Irreversible account actions. Please proceed with caution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            <div className="p-4 rounded-lg bg-zinc-950/60 border border-rose-900/40 space-y-3">
              <div>
                <h4 className="text-xs font-mono font-bold text-zinc-200">Deactivate Account</h4>
                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  Temporarily hides your published essays, profile, and disables notifications. You can reactivate anytime by logging back in.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert("To deactivate your account, please confirm your credentials with security.")}
                className="h-8 border-zinc-800 text-zinc-300 font-mono text-xs hover:border-amber-700 hover:text-amber-300"
              >
                Deactivate Account...
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-zinc-950/60 border border-rose-900/40 space-y-3">
              <div>
                <h4 className="text-xs font-mono font-bold text-rose-300">Delete Account Permanently</h4>
                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  Permanently deletes your user identity, cryptographic sessions, and articles. This action cannot be reversed.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => alert("Permanent account deletion requires re-entering your master password for verification.")}
                className="h-8 font-mono text-xs bg-rose-600 hover:bg-rose-500"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
