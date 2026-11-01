import Link from "next/link";
import { globalSearch, fetchCategories } from "@/lib/api";
import { ArticleCard } from "@/components/article-card";
import { AuthorCard } from "@/components/author-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  Sparkles,
  ArrowLeft,
  Terminal,
} from "lucide-react";

export const revalidate = 0; // Dynamic search

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: "all" | "articles" | "authors";
    sort?: "relevance" | "latest" | "popular" | "trending";
    category?: string;
    tag?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const searchQuery = params.q || "";
  const searchType = params.type || "all";
  const currentSort = params.sort || (searchQuery ? "relevance" : "latest");
  const currentCategory = params.category || "";
  const currentTag = params.tag || "";
  const currentPage = parseInt(params.page || "1", 10);

  const [searchRes, categoriesRes] = await Promise.all([
    globalSearch({
      q: searchQuery,
      type: searchType,
      sort: currentSort,
      category: currentCategory,
      tag: currentTag,
      page: currentPage,
      per_page: 10,
    }),
    fetchCategories(),
  ]);

  const searchData = searchRes.data || {
    query: searchQuery,
    type: searchType,
    articles: [],
    authors: [],
    articles_total: 0,
    authors_total: 0,
    meta: { page: 1, per_page: 10, total_pages: 1, articles_total: 0, authors_total: 0 },
  };

  const categories = categoriesRes.data?.categories || [];
  const totalPages = searchData.meta?.total_pages || 1;

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const current: Record<string, string> = {};
    if (searchQuery) current.q = searchQuery;
    if (searchType !== "all") current.type = searchType;
    if (currentSort !== "relevance") current.sort = currentSort;
    if (currentCategory) current.category = currentCategory;
    if (currentTag) current.tag = currentTag;

    const merged = { ...current, ...overrides };
    const query = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) query.set(k, v);
    });
    return `/search?${query.toString()}`;
  };

  return (
    <div className="container max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Breadcrumb / Top Bar */}
      <div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Explorer</span>
        </Link>
      </div>

      {/* Header & Main Search Box */}
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
            <Search className="w-4 h-4" />
            <span>postgres_fts // full_text_search</span>
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-100">
            Search & Discovery
          </h1>
          <p className="text-sm text-zinc-400 font-sans">
            Full-text indexing with weighted title priority, English stemming, and explainable discovery ranking.
          </p>
        </div>

        {/* Search Input Bar */}
        <form method="GET" action="/search" className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-3.5 text-zinc-500" />
          <Input
            name="q"
            defaultValue={searchQuery}
            placeholder="Search keywords, systems, algorithms, authors, or topics..."
            className="pl-11 h-12 bg-zinc-950 border-zinc-800 text-sm font-sans w-full focus:border-emerald-500 transition-colors"
          />
          {searchType !== "all" && <input type="hidden" name="type" value={searchType} />}
          {currentSort !== "relevance" && <input type="hidden" name="sort" value={currentSort} />}
          {currentCategory && <input type="hidden" name="category" value={currentCategory} />}
          {currentTag && <input type="hidden" name="tag" value={currentTag} />}
          <Button
            type="submit"
            className="absolute right-1.5 h-9 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono text-xs font-semibold px-4"
          >
            Search
          </Button>
        </form>
      </div>

      {/* Search Filter Toolbar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Result Type Tabs */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-500 mr-1">Type:</span>
            <Link href={buildUrl({ type: undefined, page: undefined })}>
              <Badge
                variant={searchType === "all" ? "default" : "outline"}
                className={`cursor-pointer font-mono text-xs py-1 ${
                  searchType === "all"
                    ? "bg-emerald-600 text-zinc-950 font-bold"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All Results
              </Badge>
            </Link>
            <Link href={buildUrl({ type: "articles", page: undefined })}>
              <Badge
                variant={searchType === "articles" ? "default" : "outline"}
                className={`cursor-pointer font-mono text-xs py-1 gap-1 ${
                  searchType === "articles"
                    ? "bg-emerald-600 text-zinc-950 font-bold"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>Articles ({searchData.articles_total})</span>
              </Badge>
            </Link>
            <Link href={buildUrl({ type: "authors", page: undefined })}>
              <Badge
                variant={searchType === "authors" ? "default" : "outline"}
                className={`cursor-pointer font-mono text-xs py-1 gap-1 ${
                  searchType === "authors"
                    ? "bg-emerald-600 text-zinc-950 font-bold"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Users className="w-3 h-3" />
                <span>Authors ({searchData.authors_total})</span>
              </Badge>
            </Link>
          </div>

          {/* Sort Selection Chips */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Sort:
            </span>
            {(["relevance", "latest", "trending", "popular"] as const).map((s) => {
              const active = currentSort === s;
              return (
                <Link key={s} href={buildUrl({ sort: s, page: undefined })}>
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
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && searchType !== "authors" && (
          <div className="pt-3 border-t border-zinc-800/60 flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-500 mr-1">Topic:</span>
            <Link href={buildUrl({ category: undefined, page: undefined })}>
              <Badge
                variant={!currentCategory ? "secondary" : "outline"}
                className={`cursor-pointer text-xs py-0.5 ${
                  !currentCategory
                    ? "bg-zinc-800 text-emerald-400 font-semibold"
                    : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                All Topics
              </Badge>
            </Link>
            {categories.map((c) => (
              <Link key={c.slug} href={buildUrl({ category: c.slug, page: undefined })}>
                <Badge
                  variant={currentCategory === c.slug ? "secondary" : "outline"}
                  className={`cursor-pointer text-xs py-0.5 ${
                    currentCategory === c.slug
                      ? "bg-zinc-800 text-emerald-400 font-semibold"
                      : "border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {c.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Matching Authors Shelf (if 'all' or 'authors' type) */}
      {(searchType === "all" || searchType === "authors") && searchData.authors.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Matching Authors ({searchData.authors_total})</span>
            </h2>
            {searchType === "all" && searchData.authors_total > searchData.authors.length && (
              <Link
                href={buildUrl({ type: "authors" })}
                className="text-xs font-mono text-emerald-400 hover:underline"
              >
                View all authors &rarr;
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {searchData.authors.map((a) => (
              <AuthorCard key={a.user_id} author={a} />
            ))}
          </div>
        </section>
      )}

      {/* Matching Articles Shelf (if 'all' or 'articles' type) */}
      {(searchType === "all" || searchType === "articles") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Matching Articles ({searchData.articles_total})</span>
            </h2>
            <span className="text-xs font-mono text-zinc-500">
              Sorted by: {currentSort}
            </span>
          </div>

          {searchData.articles.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-zinc-800 text-zinc-500 space-y-3">
              <Terminal className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-sans">
                No articles matched your search query.
              </p>
              <p className="text-xs font-mono text-zinc-600">
                Try searching for broader terms like &quot;architecture&quot;, &quot;database&quot;, or &quot;Go&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {searchData.articles.map((art) => (
                <ArticleCard key={art.id} article={art} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
              <Link
                href={buildUrl({ page: Math.max(1, currentPage - 1).toString() })}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
              >
                <Button variant="outline" size="sm" className="border-zinc-800 font-mono text-xs">
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
              </Link>
              <span className="text-xs font-mono text-zinc-500">
                Page {currentPage} of {totalPages}
              </span>
              <Link
                href={buildUrl({ page: Math.min(totalPages, currentPage + 1).toString() })}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              >
                <Button variant="outline" size="sm" className="border-zinc-800 font-mono text-xs">
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

