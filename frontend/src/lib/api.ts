export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
  meta?: {
    page?: number;
    per_page?: number;
    total_records?: number;
    total_pages?: number;
  };
}

export interface AuthorRef {
  username: string;
  display_name: string;
  displayName?: string;
  avatar_url?: string | null;
  headline?: string | null;
}

export interface CategoryRef {
  name: string;
  slug: string;
}

export interface TagRef {
  name: string;
  slug: string;
}

export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  cover_image_url?: string | null;
  reading_time_minutes: number;
  views_count: number;
  likes_count: number;
  bookmarks_count: number;
  comments_count: number;
  featured: boolean;
  published_at: string;
  author: AuthorRef;
  category?: CategoryRef | null;
  tags?: TagRef[];
}

export interface ArticleDetail extends ArticleSummary {
  content: string;
  content_html: string;
  canonical_url?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon_name?: string | null;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  usage_count: number;
}

export interface AuthorSummary {
  user_id: string;
  username: string;
  display_name: string;
  headline?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  article_count: number;
  follower_count: number;
  following_count: number;
  joined_at: string;
}

export interface AuthorDetail extends AuthorSummary {
  github_url?: string | null;
  twitter_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  location?: string | null;
}

export interface AuthorStats {
  total_articles: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_bookmarks: number;
  follower_count: number;
  following_count: number;
}

export interface UpdateProfileInput {
  username?: string;
  display_name?: string;
  headline?: string;
  bio?: string;
  avatar_url?: string;
  github_url?: string;
  twitter_url?: string;
  linkedin_url?: string;
  website_url?: string;
  location?: string;
}

export interface HealthCheckData {
  status: "healthy" | "degraded";
  version: string;
  uptime_seconds: number;
  timestamp: string;
  services: {
    database: {
      status: string;
      error?: string;
      latency?: string;
    };
    redis: {
      status: string;
      error?: string;
      latency?: string;
    };
  };
}

// ==========================================
// API CLIENT CALLS
// ==========================================

export async function fetchHealth(): Promise<ApiResponse<HealthCheckData>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: "CONNECTION_FAILED",
        message: error?.message || "Failed to reach backend",
      },
    };
  }
}

export async function fetchArticles(params: {
  page?: number;
  per_page?: number;
  sort?: "latest" | "trending" | "featured";
  category?: string;
  tag?: string;
  q?: string;
} = {}): Promise<ApiResponse<{ articles: ArticleSummary[] }>> {
  try {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.per_page) query.set("per_page", params.per_page.toString());
    if (params.sort) query.set("sort", params.sort);
    if (params.category) query.set("category", params.category);
    if (params.tag) query.set("tag", params.tag);
    if (params.q) query.set("q", params.q);

    const res = await fetch(`${API_BASE_URL}/api/v1/articles?${query.toString()}`, {
      next: { revalidate: 30 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load articles" },
    };
  }
}

export async function fetchArticle(slug: string): Promise<ApiResponse<{ article: ArticleDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/${slug}`, {
      next: { revalidate: 30 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load article" },
    };
  }
}

export async function fetchFeaturedArticles(limit = 6): Promise<ApiResponse<{ articles: ArticleSummary[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/featured?limit=${limit}`, {
      next: { revalidate: 60 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load featured articles" },
    };
  }
}

export async function fetchTrendingArticles(limit = 6): Promise<ApiResponse<{ articles: ArticleSummary[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/trending?limit=${limit}`, {
      next: { revalidate: 60 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load trending articles" },
    };
  }
}

export async function fetchCategories(): Promise<ApiResponse<{ categories: Category[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/categories`, {
      next: { revalidate: 120 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load categories" },
    };
  }
}

export async function fetchCategory(slug: string): Promise<ApiResponse<{ category: Category }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/categories/${slug}`, {
      next: { revalidate: 120 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load category" },
    };
  }
}

export async function fetchTags(limit = 30, offset = 0): Promise<ApiResponse<{ tags: Tag[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tags?limit=${limit}&offset=${offset}`, {
      next: { revalidate: 120 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load tags" },
    };
  }
}

export async function fetchTag(slug: string): Promise<ApiResponse<{ tag: Tag }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/tags/${slug}`, {
      next: { revalidate: 120 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load tag" },
    };
  }
}

export async function fetchAuthors(page = 1, perPage = 12): Promise<ApiResponse<{ authors: AuthorSummary[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/authors?page=${page}&per_page=${perPage}`, {
      next: { revalidate: 60 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load authors" },
    };
  }
}

export async function fetchAuthor(username: string): Promise<ApiResponse<{ author: AuthorDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/authors/${username}`, {
      next: { revalidate: 60 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load author" },
    };
  }
}

export async function fetchAuthorArticles(
  username: string,
  page = 1,
  perPage = 10
): Promise<ApiResponse<{ articles: ArticleSummary[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/authors/${username}/articles?page=${page}&per_page=${perPage}`, {
      next: { revalidate: 30 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load author articles" },
    };
  }
}

export async function fetchAuthorStats(username: string): Promise<ApiResponse<{ stats: AuthorStats }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/authors/${username}/stats`, {
      next: { revalidate: 30 },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load author stats" },
    };
  }
}

export async function fetchMyProfile(token: string): Promise<ApiResponse<{ author: AuthorDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/authors/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load user profile" },
    };
  }
}

export async function updateAuthorProfile(
  token: string,
  data: UpdateProfileInput
): Promise<ApiResponse<{ author: AuthorDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/authors/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: error?.message || "Failed to update profile" },
    };
  }
}
