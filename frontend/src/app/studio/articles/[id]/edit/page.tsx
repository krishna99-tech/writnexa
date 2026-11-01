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
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

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
      setSuccessMsg("Article updated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handlePublishNow = async () => {
    if (!accessToken) return;
    setIsSubmitting(true);
    // Save latest content first then trigger publish
    await handleSave("published");
    const res = await publishStudioArticle(accessToken, id);
    setIsSubmitting(false);

    if (res.success && res.data?.article) {
      setArticle(res.data.article);
      setSuccessMsg("Article published successfully! It is now live in Explorer.");
    } else {
      setErrorMsg(res.error?.message || "Failed to publish article.");
    }
  };

  const handleArchiveNow = async () => {
    if (!accessToken) return;
    if (!confirm("Are you sure you want to archive this article? It will no longer be visible in public search and explore feeds.")) return;

    setIsSubmitting(true);
    const res = await archiveStudioArticle(accessToken, id);
    setIsSubmitting(false);

    if (res.success && res.data?.article) {
      setArticle(res.data.article);
      setSuccessMsg("Article archived successfully.");
    } else {
      setErrorMsg(res.error?.message || "Failed to archive article.");
    }
  };

  const handleDelete = async () => {
    if (!accessToken || !article) return;
    if (!confirm(`Are you sure you want to delete "${article.title}"? This cannot be undone.`)) return;

    const res = await deleteStudioArticle(accessToken, id);
    if (res.success) {
      router.push("/studio/articles");
    } else {
      setErrorMsg(res.error?.message || "Failed to delete article.");
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center font-mono text-xs text-zinc-500">
        Loading article details...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="font-mono text-rose-400 text-sm">
          {errorMsg || "Article not found or you are not authorized to edit it."}
        </p>
        <Link href="/studio/articles">
          <Button variant="outline" className="font-mono text-xs">
            Back to Articles
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/studio/articles"
            className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                Edit Article
              </span>
              <StatusBadge status={article.status} />
            </div>
            <h1 className="text-xl font-extrabold text-zinc-100 line-clamp-1">
              {article.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 mr-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>~{estimatedReadingTime} min read ({wordCount} words)</span>
          </div>

          {article.status === "published" && (
            <Link href={`/article/${article.slug}`} target="_blank">
              <Button
                variant="outline"
                className="border-zinc-800 text-emerald-400 hover:text-emerald-300 font-mono text-xs gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Live</span>
              </Button>
            </Link>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSave()}
            className="border-zinc-800 hover:bg-zinc-900 text-zinc-200 font-mono text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </Button>

          {article.status !== "published" ? (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handlePublishNow}
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs gap-1.5 shadow-md shadow-emerald-950/40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Now</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleArchiveNow}
              className="border-zinc-800 text-zinc-400 hover:text-zinc-200 font-mono text-xs gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            className="text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
            title="Delete article"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metadata Form Section */}
      <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-semibold text-zinc-200">
            Article Title
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base font-bold h-11"
            required
          />
        </div>

        {/* Slug Customization */}
        <div className="space-y-1.5 font-mono">
          <Label htmlFor="slug" className="text-xs text-zinc-400">
            Canonical URL Slug
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-600 text-xs">
              quorix.io/article/
            </span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              className="pl-36 text-xs text-zinc-300"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle" className="text-sm font-semibold text-zinc-200">
            Subtitle / Excerpt
          </Label>
          <Input
            id="subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Category, Cover Image, and Tags Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-semibold text-zinc-200">
              Primary Category
            </Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-zinc-800 bg-zinc-950 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cover" className="text-sm font-semibold text-zinc-200">
              Cover Image URL (Optional)
            </Label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <Input
                id="cover"
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://..."
                className="pl-9 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Tags input */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-zinc-200">
            Tags (Up to 5)
          </Label>
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-zinc-800 bg-zinc-950">
            {tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/80 text-emerald-400 font-mono text-xs px-2.5 py-1 rounded-md"
              >
                <span>#{t}</span>
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="hover:text-rose-400 transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? "Type tag name and press Enter..." : "Add another tag..."}
                className="bg-transparent text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none flex-1 min-w-[140px] px-2 py-1"
              />
            )}
          </div>
        </div>
      </div>

      {/* Markdown Editor Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-bold text-zinc-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Article Content (Markdown)</span>
          </Label>
          <span className="font-mono text-xs text-zinc-500">
            GFM tables, code blocks, images, links & KaTeX formulas supported
          </span>
        </div>

        <MarkdownEditor
          value={content}
          onChange={setContent}
          minHeight="550px"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "published":
      return (
        <Badge className="bg-emerald-950/60 text-emerald-400 border-emerald-800 uppercase text-[10px] font-mono">
          Published
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-amber-950/60 text-amber-400 border-amber-800 uppercase text-[10px] font-mono">
          Draft
        </Badge>
      );
    case "archived":
      return (
        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 uppercase text-[10px] font-mono">
          Archived
        </Badge>
      );
    default:
      return null;
  }
}
