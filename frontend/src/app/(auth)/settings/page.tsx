"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import {
  API_BASE_URL,
  ApiResponse,
  AuthorDetail,
  fetchMyProfile,
  updateAuthorProfile,
} from "@/lib/api";
import {
  User,
  Shield,
  Key,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ExternalLink,
  Save,
  Globe,
  Github,
  Twitter,
  Linkedin,
  MapPin,
  Sparkles,
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
  const { user, profile, accessToken, isLoading, fetchCurrentUser } = useAuth();

  // Profile Edit State
  const [displayName, setDisplayName] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [location, setLocation] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  const loadProfile = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingProfile(true);
    const res = await fetchMyProfile(accessToken);
    if (res.success && res.data?.author) {
      const a = res.data.author;
      setDisplayName(a.display_name || "");
      setUsernameInput(a.username || "");
      setHeadline(a.headline || "");
      setBio(a.bio || "");
      setAvatarUrl(a.avatar_url || "");
      setLocation(a.location || "");
      setGithubUrl(a.github_url || "");
      setTwitterUrl(a.twitter_url || "");
      setLinkedinUrl(a.linkedin_url || "");
      setWebsiteUrl(a.website_url || "");
    }
    setIsLoadingProfile(false);
  }, [accessToken]);

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
      loadProfile();
      fetchSessions();
    }
  }, [isLoading, user, accessToken, router, loadProfile, fetchSessions]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setProfileError(null);
    setProfileSuccess(null);
    setIsSavingProfile(true);

    const res = await updateAuthorProfile(accessToken, {
      display_name: displayName,
      username: usernameInput,
      headline: headline,
      bio: bio,
      avatar_url: avatarUrl,
      location: location,
      github_url: githubUrl,
      twitter_url: twitterUrl,
      linkedin_url: linkedinUrl,
      website_url: websiteUrl,
    });

    setIsSavingProfile(false);

    if (!res.success) {
      setProfileError(res.error?.message || "Failed to update profile.");
    } else {
      setProfileSuccess("Public author profile updated successfully!");
      await fetchCurrentUser(accessToken);
    }
  };

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
            {profile?.username && (
              <CardFooter className="pt-0">
                <Link
                  href={`/author/${profile.username}`}
                  target="_blank"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 font-mono text-xs transition-colors"
                >
                  <span>View Public Profile</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Profile & Security Controls */}
        <div className="md:col-span-2 space-y-6">
          {/* Public Profile Editor */}
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <CardTitle className="text-lg text-zinc-100">Author Profile</CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Customize your public engineering profile, bio, and developer socials visible at{" "}
                <span className="font-mono text-emerald-400">/author/{profile?.username || "username"}</span>
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                {profileSuccess && (
                  <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between gap-2 font-mono">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{profileSuccess}</span>
                    </div>
                    {usernameInput && (
                      <Link
                        href={`/author/${usernameInput}`}
                        className="underline hover:text-emerald-200"
                      >
                        Preview Profile &rarr;
                      </Link>
                    )}
                  </div>
                )}
                {profileError && (
                  <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="usernameInput">Username Handle</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm">@</span>
                      <Input
                        id="usernameInput"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="username"
                        className="pl-8 font-mono"
                        required
                        minLength={3}
                        maxLength={30}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="headline">Professional Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Staff Distributed Systems Architect & Go Contributor"
                    maxLength={160}
                  />
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Brief one-line summary displayed on your profile and article cards.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">Biography</Label>
                  <textarea
                    id="bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the developer community about your background, projects, and technical interests..."
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    maxLength={2000}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input
                      id="avatarUrl"
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco, CA / Remote"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Social Links Grid */}
                <div className="pt-2 space-y-3">
                  <span className="text-xs font-mono text-zinc-400 block font-semibold">
                    Developer Socials & Links
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="githubUrl" className="flex items-center gap-1.5">
                        <Github className="w-3.5 h-3.5 text-zinc-400" />
                        <span>GitHub Profile</span>
                      </Label>
                      <Input
                        id="githubUrl"
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="linkedinUrl" className="flex items-center gap-1.5">
                        <Linkedin className="w-3.5 h-3.5 text-zinc-400" />
                        <span>LinkedIn Profile</span>
                      </Label>
                      <Input
                        id="linkedinUrl"
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="twitterUrl" className="flex items-center gap-1.5">
                        <Twitter className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Twitter / X</span>
                      </Label>
                      <Input
                        id="twitterUrl"
                        type="url"
                        value={twitterUrl}
                        onChange={(e) => setTwitterUrl(e.target.value)}
                        placeholder="https://x.com/..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="websiteUrl" className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Personal Website / Blog</span>
                      </Label>
                      <Input
                        id="websiteUrl"
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2 border-t border-zinc-800/60">
                <Button
                  type="submit"
                  disabled={isSavingProfile || isLoadingProfile}
                  className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

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

