import {
  fetchFeaturedArticles,
  fetchTrendingArticles,
  fetchArticles,
  fetchCategories,
  fetchAuthors,
  fetchHealth,
} from "@/lib/api";
import { HomeView } from "@/components/home-view";

export const revalidate = 30; // SSR with 30s cache revalidation

export default async function HomePage() {
  const [
    featuredRes,
    trendingRes,
    latestRes,
    categoriesRes,
    authorsRes,
    healthRes,
  ] = await Promise.all([
    fetchFeaturedArticles(4),
    fetchTrendingArticles(4),
    fetchArticles({ per_page: 8, sort: "latest" }),
    fetchCategories(),
    fetchAuthors(1, 5),
    fetchHealth(),
  ]);

  const featured = featuredRes.data?.articles || [];
  const trending = trendingRes.data?.articles || [];
  const latest = latestRes.data?.articles || [];
  const categories = categoriesRes.data?.categories || [];
  const authors = (authorsRes.data?.authors || []).filter(
    (a) =>
      a.username !== "admin" &&
      a.username !== "super_admin" &&
      a.display_name !== "System Administrator" &&
      !a.display_name.toLowerCase().includes("administrator")
  );
  const databaseHealthy =
    healthRes.data?.services?.database?.status === "connected" ||
    healthRes.data?.status === "healthy";

  return (
    <HomeView
      featured={featured}
      trending={trending}
      latest={latest}
      categories={categories}
      authors={authors}
      databaseHealthy={databaseHealthy}
    />
  );
}
