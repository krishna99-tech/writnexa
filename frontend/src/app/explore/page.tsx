import Link from "next/link";
import { fetchArticles, fetchCategories } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Compass, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

export const revalidate = 30;

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: "latest" | "trending" | "featured";
    category?: string;
    tag?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || "1", 10);
  const currentSort = params.sort || "latest";
  const currentCategory = params.category || "";
  const currentTag = params.tag || "";
  const searchQuery = params.q || "";

  const [articlesRes, categoriesRes] = await Promise.all([
    fetchArticles({
      page: currentPage,
      per_page: 8,
      sort: currentSort,
      category: currentCategory,
      tag: currentTag,
      q: searchQuery,
    }),
    fetchCategories(),
  ]);

  const articles = articlesRes.data?.articles || [];
  const meta = articlesRes.meta || { page: 1, total_pages: 1, total_records: 0 };
  const categories = categoriesRes.data?.categories || [];

  return (
    <div className="container mx-auto px-4 py-10 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
          <Compass className="w-4 h-4" />
          <span>public_explorer // discovery_index</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
          Explore Technical Knowledge
        </h1>
        <p className="text-sm text-zinc-400 font-sans">
          Browse software engineering deep-dives, systems architecture blueprints, and tutorials.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
        {/* Search Input */}
        <form method="GET" action="/search" className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-zinc-500" />
          <Input
            name="q"
            defaultValue={searchQuery}
            placeholder="Search keywords, topics, systems, algorithms, or authors..."
            className="pl-9 bg-zinc-950 border-zinc-800 font-mono text-xs h-10 w-full"
          />
        </form>

        {/* Sort & Category Chips */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-800/60">
          {/* Sorting Tabs */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Sort:
            </span>
            {(["latest", "trending", "popular", "featured"] as const).map((s) => {
              const active = currentSort === s;
              const nextParams = new URLSearchParams();
              if (searchQuery) nextParams.set("q", searchQuery);
              if (currentCategory) nextParams.set("category", currentCategory);
              if (currentTag) nextParams.set("tag", currentTag);
              nextParams.set("sort", s);

              return (
                <Link key={s} href={`/explore?${nextParams.toString()}`}>
                  <Badge
                    variant={active ? "default" : "outline"}
                    className={`capitalize font-mono text-xs py-1 cursor-pointer ${
                      active
                        ? "bg-emerald-600 text-zinc-950 font-bold"
                        : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {s}
                  </Badge>
                </Link>
              );
            })}
            <Link href="/feed/following">
              <Badge
                variant="outline"
                className="font-mono text-xs py-1 cursor-pointer border-emerald-800/60 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 hover:border-emerald-700 transition-colors"
              >
                Following Feed &rarr;
              </Badge>
            </Link>
          </div>

          {/* Active Filter Clear */}
          {(searchQuery || currentCategory || currentTag) && (
            <Link
              href="/explore"
              className="text-xs font-mono text-rose-400 hover:underline"
            >
              Clear all filters &times;
            </Link>
          )}
        </div>

        {/* Category Horizontal Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
          <Link href={`/explore?sort=${currentSort}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}>
            <Badge
              variant={!currentCategory ? "default" : "outline"}
              className={`cursor-pointer ${
                !currentCategory
                  ? "bg-zinc-100 text-zinc-950"
                  : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Topics
            </Badge>
          </Link>
          {categories.map((c) => {
            const active = currentCategory === c.slug;
            return (
              <Link
                key={c.id}
                href={`/explore?category=${c.slug}&sort=${currentSort}${
                  searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""
                }`}
              >
                <Badge
                  variant={active ? "default" : "outline"}
                  className={`cursor-pointer ${
                    active
                      ? "bg-emerald-600 text-zinc-950 font-semibold"
                      : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {c.name}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Article Grid */}
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((art) => (
            <ArticleCard key={art.id} article={art} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3 font-mono text-zinc-400">
          <p className="text-base text-zinc-300">No published articles found.</p>
          <p className="text-xs text-zinc-500">
            Try adjusting your search terms or clearing category filters.
          </p>
          <Link href="/explore">
            <Button variant="outline" size="sm" className="mt-2 border-zinc-700">
              Reset Filters
            </Button>
          </Link>
        </div>
      )}

      {/* Pagination Controls */}
      {meta.total_pages && meta.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-800 pt-6 text-xs font-mono">
          <span className="text-zinc-500">
            Page {meta.page} of {meta.total_pages} ({meta.total_records} articles total)
          </span>

          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={`/explore?page=${currentPage - 1}&sort=${currentSort}${
                  currentCategory ? `&category=${currentCategory}` : ""
                }${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
              >
                <Button variant="outline" size="sm" className="gap-1 border-zinc-700">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-1 border-zinc-800 opacity-50">
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
            )}

            {currentPage < meta.total_pages ? (
              <Link
                href={`/explore?page=${currentPage + 1}&sort=${currentSort}${
                  currentCategory ? `&category=${currentCategory}` : ""
                }${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
              >
                <Button variant="outline" size="sm" className="gap-1 border-zinc-700">
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled className="gap-1 border-zinc-800 opacity-50">
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

