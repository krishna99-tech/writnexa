"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchMyProfile,
  updateAuthorProfile,
  AuthorDetail,
} from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Github,
  Linkedin,
  Twitter,
  Globe,
  MapPin,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Camera,
  Layers,
} from "lucide-react";

export default function WorkspaceProfilePage() {
  const { accessToken, profile, fetchCurrentUser } = useAuth();
  const [authorDetail, setAuthorDetail] = useState<AuthorDetail | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [location, setLocation] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    fetchMyProfile(accessToken).then((res) => {
      if (res.success && res.data?.author) {
        const a = res.data.author;
        setAuthorDetail(a);
        setDisplayName(a.display_name || "");
        setUsernameInput(a.username || "");
        setHeadline(a.headline || "");
        setBio(a.bio || "");
        setAvatarUrl(a.avatar_url || "");
        setCoverImageUrl(a.cover_image_url || "");
        setLocation(a.location || "");
        setGithubUrl(a.github_url || "");
        setTwitterUrl(a.twitter_url || "");
        setLinkedinUrl(a.linkedin_url || "");
        setWebsiteUrl(a.website_url || "");
      }
    });
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    const res = await updateAuthorProfile(accessToken, {
      display_name: displayName,
      username: usernameInput,
      headline,
      bio,
      avatar_url: avatarUrl,
      cover_image_url: coverImageUrl,
      location,
      github_url: githubUrl,
      twitter_url: twitterUrl,
      linkedin_url: linkedinUrl,
      website_url: websiteUrl,
    });

    setIsSaving(false);

    if (res.success && res.data?.author) {
      setSuccessMsg("Your public profile has been updated successfully.");
      setAuthorDetail(res.data.author);
      await fetchCurrentUser();
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error?.message || "Failed to save profile updates.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
            Public Author Profile
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            This information is publicly visible on your author card and article pages.
          </p>
        </div>

        {authorDetail?.username && (
          <Link href={`/author/${authorDetail.username}`} target="_blank">
            <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-300 font-mono text-xs gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>View Live Profile</span>
            </Button>
          </Link>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Banner and Avatar Preview Card */}
        <Card className="bg-zinc-900/40 border-zinc-800/80 overflow-hidden">
          {/* Cover Banner */}
          <div
            className="w-full h-36 bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-950 relative border-b border-zinc-800/80 bg-cover bg-center"
            style={{ backgroundImage: coverImageUrl ? `url(${coverImageUrl})` : undefined }}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" />
            <div className="absolute top-3 right-3">
              <Badge variant="outline" className="bg-zinc-950/80 text-[10px] font-mono border-zinc-700 text-zinc-300">
                Cover Banner Preview
              </Badge>
            </div>
          </div>

          <div className="px-6 pb-6 pt-0 relative">
            {/* Avatar overlapping banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-zinc-950 bg-zinc-800 flex items-center justify-center text-zinc-300 font-mono text-2xl font-bold shadow-xl overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{displayName ? displayName.charAt(0).toUpperCase() : "Q"}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
                <div>
                  <span className="font-bold text-zinc-200">{authorDetail?.article_count || 0}</span> Articles
                </div>
                <div>
                  <span className="font-bold text-zinc-200">{authorDetail?.follower_count || 0}</span> Followers
                </div>
                <div>
                  <span className="font-bold text-zinc-200">{authorDetail?.following_count || 0}</span> Following
                </div>
              </div>
            </div>

            {/* Image URLs Input Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-zinc-400">Avatar Image URL</Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-zinc-400">Cover Banner Image URL</Label>
                <Input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://example.com/cover-banner.jpg"
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Identity & Bio */}
        <Card className="bg-zinc-900/40 border-zinc-800/80">
          <CardHeader>
            <CardTitle className="font-mono text-base text-zinc-100">Identity & Technical Headline</CardTitle>
            <CardDescription className="text-xs text-zinc-400 font-mono">
              Basic identification for the engineering community.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-zinc-400">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                  className="bg-zinc-950 border-zinc-800 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-zinc-400">Username (@handle)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-zinc-500 text-xs">@</span>
                  <Input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="adalovelace"
                    required
                    className="pl-7 bg-zinc-950 border-zinc-800 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400">Professional Headline</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Systems Engineer & Distributed Systems Architect"
                className="bg-zinc-950 border-zinc-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400">Author Biography</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell readers about your technical background, current projects, and open-source contributions..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Developer Links */}
        <Card className="bg-zinc-900/40 border-zinc-800/80">
          <CardHeader>
            <CardTitle className="font-mono text-base text-zinc-100">Developer Links & Socials</CardTitle>
            <CardDescription className="text-xs text-zinc-400 font-mono">
              Connect your developer profiles so readers can verify your work.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-zinc-400" />
                <span>GitHub Profile URL</span>
              </Label>
              <Input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username"
                className="bg-zinc-950 border-zinc-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                <span>LinkedIn Profile URL</span>
              </Label>
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="bg-zinc-950 border-zinc-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <Twitter className="w-3.5 h-3.5 text-sky-400" />
                <span>Twitter / X Profile URL</span>
              </Label>
              <Input
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://x.com/username"
                className="bg-zinc-950 border-zinc-800 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Personal Website / Blog</span>
              </Label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourblog.dev"
                className="bg-zinc-950 border-zinc-800 text-xs font-mono"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/60 pt-4">
            <div>
              {successMsg && (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}
              {errorMsg && (
                <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-2 font-mono text-xs shadow-sm h-9 px-5 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Profile"}</span>
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

