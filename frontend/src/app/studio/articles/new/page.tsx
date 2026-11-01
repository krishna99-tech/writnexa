"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  fetchCategories,
  createStudioArticle,
  Category,
} from "@/lib/api";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";

export default function NewArticlePage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  // Form Fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-generate slug from title if not customized
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isCustomSlug) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generated);
    }
  };

  useEffect(() => {
    async function loadCats() {
      const res = await fetchCategories();
      if (res.success && res.data?.categories) {
        setCategories(res.data.categories);
        if (res.data.categories.length > 0) {
          setCategoryId(res.data.categories[0].id);
        }
      }
    }
    loadCats();
  }, []);

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

  // Estimate reading time
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedReadingTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleSave = async (status: "draft" | "published") => {
    if (!accessToken) return;
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
    const res = await createStudioArticle(accessToken, {
      title: title.trim(),
      slug: slug.trim() || undefined,
      subtitle: subtitle.trim() || undefined,
      content,
      cover_image_url: coverImageUrl.trim() || undefined,
      category_id: categoryId || undefined,
      tags,
      status,
    });
    setIsSubmitting(false);

    if (!res.success || !res.data?.article) {
      setErrorMsg(res.error?.message || "Failed to create article.");
    } else {
      const art = res.data.article;
      if (status === "published") {
        setSuccessMsg("Article published successfully! Redirecting...");
        setTimeout(() => {
          router.push(`/article/${art.slug}`);
        }, 1200);
      } else {
        setSuccessMsg("Draft saved successfully!");
        setTimeout(() => {
          router.push(`/studio/articles/${art.id}/edit`);
        }, 1000);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/studio/articles"
            className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="font-mono text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              Author Studio
            </span>
            <h1 className="text-xl font-extrabold text-zinc-100">
              Create New Article
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400 mr-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>~{estimatedReadingTime} min read ({wordCount} words)</span>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSave("draft")}
            className="border-zinc-800 hover:bg-zinc-900 text-zinc-200 font-mono text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </Button>

          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave("published")}
            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs gap-1.5 shadow-md shadow-emerald-950/40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Article</span>
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
            onChange={handleTitleChange}
            placeholder="e.g. Distributed Consensus in Go: Building a Raft-Compliant Cluster"
            className="text-base font-bold h-11"
            required
          />
        </div>

        {/* Slug Customization */}
        <div className="space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-xs">
            <Label htmlFor="slug" className="text-zinc-400">
              Canonical URL Slug
            </Label>
            <button
              type="button"
              onClick={() => setIsCustomSlug(!isCustomSlug)}
              className="text-emerald-400 hover:underline text-[11px]"
            >
              {isCustomSlug ? "Reset to Auto-Slug" : "Customize Slug"}
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-600 text-xs">
              quorix.io/article/
            </span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setIsCustomSlug(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              readOnly={!isCustomSlug}
              placeholder="auto-generated-from-title"
              className="pl-36 text-xs text-zinc-300"
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
            placeholder="A short technical overview that summarizes the architectural concepts..."
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
                placeholder="https://images.unsplash.com/photo-..."
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
          <p className="text-[11px] font-mono text-zinc-500">
            Press Enter or comma to add a tag (e.g. Go, Architecture, Concurrency).
          </p>
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
          placeholder="# Introduction&#10;&#10;Start writing your engineering article here with code snippets, architecture diagrams, and benchmarks..."
        />
      </div>
    </div>
  );
}
