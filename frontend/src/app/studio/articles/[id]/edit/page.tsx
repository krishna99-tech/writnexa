"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchStudioArticle,
  updateStudioArticle,
  publishStudioArticle,
  archiveStudioArticle,
  deleteStudioArticle,
  fetchCategories,
  Category,
  StudioArticleDetail,
} from "@/lib/api";
import { MarkdownEditor } from "@/components/markdown-editor";
import { StudioZenWriterModal } from "@/components/studio-zen-writer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Send,
  ArrowLeft,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Archive,
  Trash2,
  ExternalLink,
  SlidersHorizontal,
  BookOpen,
  Tag,
  Globe,
  Search,
} from "lucide-react";

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { accessToken } = useAuth();
  const router = useRouter();

  const [article, setArticle] = useState<StudioArticleDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // UI State
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(true);
  const [isZenModeOpen, setIsZenModeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!accessToken || !id) return;
      setIsLoading(true);
      const [artRes, catsRes] = await Promise.all([
        fetchStudioArticle(accessToken, id),
        fetchCategories(),
      ]);

      if (catsRes.success && catsRes.data?.categories) {
        setCategories(catsRes.data.categories);
      }

      if (artRes.success && artRes.data?.article) {
        const a = artRes.data.article;
        setArticle(a);
        setTitle(a.title);
        setSlug(a.slug);
        setSubtitle(a.subtitle || "");
        setContent(a.content);
        setCoverImageUrl(a.cover_image_url || "");
        setCategoryId(a.category_id || "");
        if (a.tags) {
          setTags(a.tags.map((t) => t.name));
        }
      } else {
        setErrorMsg("Failed to load article or unauthorized.");
      }
      setIsLoading(false);
    }
    loadData();
  }, [accessToken, id]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !tags.includes(val) && tags.length < 5) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedReadingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleSave = async (targetStatus?: "draft" | "published" | "archived") => {
    if (!accessToken || !article) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (title.trim().length < 3) {
      setErrorMsg("Please enter an article title with at least 3 characters.");
      return;
    }
    if (!content.trim()) {
      setErrorMsg("Article content cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    const res = await updateStudioArticle(accessToken, id, {
      title: title.trim(),
      slug: slug.trim() || undefined,
      subtitle: subtitle.trim() || undefined,
      content,
      cover_image_url: coverImageUrl.trim() || undefined,
      category_id: categoryId || undefined,
      tags,
      status: targetStatus || article.status,
    });
    setIsSubmitting(false);

    if (!res.success || !res.data?.article) {
      setErrorMsg(res.error?.message || "Failed to update article.");
    } else {
      setArticle(res.data.article);
      setSuccessMsg("Changes saved successfully!");
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !article) return;
    if (!confirm("Are you sure you want to permanently delete this article? This action cannot be reversed.")) return;

    setIsSubmitting(true);
    const res = await deleteStudioArticle(accessToken, id);
    setIsSubmitting(false);

    if (res.success) {
      router.push("/dashboard/articles");
    } else {
      setErrorMsg(res.error?.message || "Failed to delete article.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center font-mono text-xs text-zinc-500">
        Loading engineering essay editor...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 w-full min-h-screen">
      {/* Top Floating Action Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/articles"
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Articles</span>
          </Link>
          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />
          <Badge
            variant={article?.status === "published" ? "default" : "secondary"}
            className="text-[10px] font-mono capitalize"
          >
            {article?.status || "Draft"}
          </Badge>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-1.5 font-mono text-xs text-zinc-400 mr-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>~{estimatedReadingTime} min read</span>
            <span className="text-zinc-600">•</span>
            <span>{wordCount} words</span>
          </div>

          {article?.status === "published" && (
            <Link href={`/article/${article.slug}`} target="_blank">
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 font-mono text-xs text-zinc-400 hover:text-emerald-400">
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View Live</span>
              </Button>
            </Link>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className={`h-8 gap-1.5 font-mono text-xs ${
              showSettingsDrawer
                ? "bg-zinc-900 text-emerald-400 border border-zinc-800"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Settings</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsZenModeOpen(true)}
            className="h-8 border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 font-mono text-xs gap-1.5 shadow-sm"
            title="Open Distraction-Free Fullscreen Zen Writer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Zen Writer</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleSave()}
            className="h-8 border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-mono text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </Button>

          {article?.status === "draft" && (
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleSave("published")}
              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
            title="Delete article"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Status Alerts */}
      {errorMsg && (
        <div className="mx-4 sm:mx-8 mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-mono flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="mx-4 sm:mx-8 mt-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Canvas */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-12 py-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Cover Image */}
          {coverImageUrl ? (
            <div className="relative group rounded-xl overflow-hidden border border-zinc-800 max-h-72 w-full bg-zinc-900">
              <img
                src={coverImageUrl}
                alt="Article Cover Preview"
                className="w-full h-full object-cover max-h-72"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end p-4 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowCoverInput(true)}
                  className="h-7 text-xs font-mono bg-zinc-900/90 text-zinc-200 hover:bg-zinc-800"
                >
                  Change Image
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setCoverImageUrl("");
                    setShowCoverInput(false);
                  }}
                  className="h-7 text-xs font-mono"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : showCoverInput ? (
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
              <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <Input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="Paste cover image URL..."
                className="bg-transparent border-0 text-xs font-mono focus-visible:ring-0 text-zinc-200 placeholder:text-zinc-600 h-8"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowCoverInput(false)}
                className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCoverInput(true)}
              className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-emerald-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-zinc-900/80 border border-dashed border-zinc-800 hover:border-emerald-500/40"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Add Cover Image</span>
            </button>
          )}

          {/* Inline Typographic Article Title */}
          <div className="space-y-3">
            <textarea
              rows={1}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article Title..."
              className="w-full bg-transparent border-0 text-2xl sm:text-4xl font-extrabold text-zinc-100 placeholder:text-zinc-700 focus:outline-none resize-none tracking-tight leading-tight"
              style={{ minHeight: "52px" }}
              required
            />

            {/* Subtitle */}
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Add a technical subtitle or excerpt that summarizes key architectural concepts..."
              className="w-full bg-transparent border-0 text-sm sm:text-base text-zinc-400 placeholder:text-zinc-700 focus:outline-none font-sans"
            />
          </div>

          <div className="w-full h-[1px] bg-zinc-800/80 my-2" />

          {/* Full-Height Markdown & LaTeX Editor */}
          <div className="min-h-[580px]">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              minHeight="580px"
              placeholder="# Introduction..."
            />
          </div>
        </div>

        {/* Right Column: Settings Drawer */}
        {showSettingsDrawer && (
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800/80 bg-zinc-950 p-6 overflow-y-auto shrink-0 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-zinc-200">
                  Publishing Settings
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsDrawer(false)}
                className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Primary Category Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Primary Category</span>
              </Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-zinc-800 bg-zinc-900/60 text-xs font-mono text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tagging Engine */}
            <div className="space-y-2">
              <Label className="text-xs font-mono text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  <span>Topic Tags</span>
                </span>
                <span className="text-[10px] text-zinc-500">{tags.length}/5 max</span>
              </Label>

              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-zinc-800 bg-zinc-900/40 min-h-[42px]">
                {tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="text-[11px] font-mono gap-1 bg-zinc-800/80 text-emerald-300 border-zinc-700/80 pr-1 py-0.5"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:text-rose-400 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length < 5 && (
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={tags.length === 0 ? "Type tag & hit Enter..." : "+ tag"}
                    className="bg-transparent text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none flex-1 min-w-[80px] px-1 py-0.5"
                  />
                )}
              </div>
            </div>

            {/* Canonical Slug Customization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-purple-400" />
                  <span>Canonical URL</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setIsCustomSlug(!isCustomSlug)}
                  className="text-[11px] font-mono text-emerald-400 hover:underline"
                >
                  {isCustomSlug ? "Reset" : "Customize"}
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-[11px] font-mono">
                  writnexa.dev/article/
                </span>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setIsCustomSlug(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                  readOnly={!isCustomSlug}
                  className="pl-32 h-8 text-[11px] font-mono bg-zinc-900/60 border-zinc-800 text-zinc-200"
                />
              </div>
            </div>

            {/* Telemetry Card */}
            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-2.5 font-mono text-xs">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold block">
                Reading Telemetry
              </span>
              <div className="grid grid-cols-2 gap-2 text-zinc-300">
                <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 block">Words</span>
                  <span className="text-sm font-bold text-zinc-100">{wordCount}</span>
                </div>
                <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                  <span className="text-[10px] text-zinc-500 block">Est. Time</span>
                  <span className="text-sm font-bold text-emerald-400">~{estimatedReadingTime} min</span>
                </div>
              </div>
            </div>

            {/* Search Snippet Preview */}
            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/30 space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
                <Search className="w-3 h-3 text-zinc-500" />
                <span>Search Snippet Preview</span>
              </span>
              <div className="space-y-1 pt-1">
                <p className="text-[11px] font-mono text-emerald-500 truncate">
                  https://writnexa.dev/article/{slug || "slug-preview"}
                </p>
                <h4 className="text-xs font-semibold text-sky-400 line-clamp-1">
                  {title || "Article Title..."}
                </h4>
                <p className="text-[11px] text-zinc-400 line-clamp-2">
                  {subtitle || "Add an architectural summary to see how search engines index your essay."}
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Fullscreen Zen Writer */}
      {isZenModeOpen && (
        <StudioZenWriterModal
          title={title}
          content={content}
          onChangeTitle={setTitle}
          onChangeContent={setContent}
          onClose={() => setIsZenModeOpen(false)}
        />
      )}
    </div>
  );
}
