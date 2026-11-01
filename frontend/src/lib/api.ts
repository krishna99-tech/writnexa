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
  id?: string;
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

export interface StudioArticleSummary {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  cover_image_url?: string | null;
  status: "draft" | "published" | "archived";
  reading_time_minutes: number;
  views_count: number;
  likes_count: number;
  bookmarks_count: number;
  comments_count: number;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string | null;
  category_slug?: string | null;
  tags?: TagRef[];
}

export interface StudioArticleDetail extends StudioArticleSummary {
  content: string;
  content_html: string;
  category_id?: string | null;
  canonical_url?: string | null;
}

export interface StudioOverview {
  total_articles: number;
  published_count: number;
  draft_count: number;
  archived_count: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_bookmarks: number;
}

export interface CreateStudioArticleInput {
  title: string;
  slug?: string;
  subtitle?: string;
  content: string;
  cover_image_url?: string;
  category_id?: string;
  tags?: string[];
  status?: "draft" | "published" | "archived";
}

export interface UpdateStudioArticleInput {
  title?: string;
  slug?: string;
  subtitle?: string;
  content?: string;
  cover_image_url?: string;
  category_id?: string;
  tags?: string[];
  status?: "draft" | "published" | "archived";
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

// ==========================================
// AUTHOR STUDIO API
// ==========================================

export async function fetchStudioOverview(token: string): Promise<ApiResponse<{ overview: StudioOverview }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/studio/overview`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load studio overview" },
    };
  }
}

export async function fetchStudioArticles(
  token: string,
  params: { status?: string; search?: string; page?: number; perPage?: number } = {}
): Promise<ApiResponse<{ articles: StudioArticleSummary[] }>> {
  try {
    const status = params.status || "all";
    const q = encodeURIComponent(params.search || "");
    const page = params.page || 1;
    const perPage = params.perPage || 15;

    const res = await fetch(
      `${API_BASE_URL}/api/v1/studio/articles?status=${status}&q=${q}&page=${page}&per_page=${perPage}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load studio articles" },
    };
  }
}

export async function fetchStudioArticle(
  token: string,
  id: string
): Promise<ApiResponse<{ article: StudioArticleDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/studio/articles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to load article" },
    };
  }
}

export async function createStudioArticle(
  token: string,
  data: CreateStudioArticleInput
): Promise<ApiResponse<{ article: StudioArticleDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/studio/articles`, {
      method: "POST",
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
      error: { code: "CREATE_FAILED", message: error?.message || "Failed to create article" },
    };
  }
}

export async function updateStudioArticle(
  token: string,
  id: string,
  data: UpdateStudioArticleInput
): Promise<ApiResponse<{ article: StudioArticleDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/studio/articles/${id}`, {
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
      error: { code: "UPDATE_FAILED", message: error?.message || "Failed to update article" },
    };
  }
}

export async function publishStudioArticle(
  token: string,
  id: string
): Promise<ApiResponse<{ article: StudioArticleDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/studio/articles/${id}/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "PUBLISH_FAILED", message: error?.message || "Failed to publish article" },
    };
  }
}

export async function archiveStudioArticle(
  token: string,
  id: string
): Promise<ApiResponse<{ article: StudioArticleDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/studio/articles/${id}/archive`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "ARCHIVE_FAILED", message: error?.message || "Failed to archive article" },
    };
  }
}

export async function deleteStudioArticle(
  token: string,
  id: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/studio/articles/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "DELETE_FAILED", message: error?.message || "Failed to delete article" },
    };
  }
}

// --------------------------------------------------------------------------
// Phase 8: Community, Social Interactions & Notifications
// --------------------------------------------------------------------------

export interface CommentDetail {
  id: string;
  article_id: string;
  author_id: string;
  parent_id?: string | null;
  content: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface CommentThread extends CommentDetail {
  replies: CommentDetail[];
}

export interface BookmarkedArticle extends ArticleSummary {
  bookmarked_at: string;
}

export interface InAppNotificationItem {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: string;
  article_id?: string | null;
  comment_id?: string | null;
  title: string;
  message: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
  actor_username: string;
  actor_display_name: string;
  actor_avatar_url?: string | null;
}

export interface InteractionStatus {
  liked: boolean;
  bookmarked: boolean;
  following_author: boolean;
}

export async function toggleLike(
  token: string,
  articleId: string
): Promise<ApiResponse<{ liked: boolean; likes_count: number }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/${articleId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "LIKE_FAILED", message: error?.message || "Failed to toggle like" },
    };
  }
}

export async function toggleBookmark(
  token: string,
  articleId: string
): Promise<ApiResponse<{ bookmarked: boolean; bookmarks_count: number }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/${articleId}/bookmark`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "BOOKMARK_FAILED", message: error?.message || "Failed to toggle bookmark" },
    };
  }
}

export async function fetchInteractionStatus(
  token: string,
  articleId: string,
  authorId?: string
): Promise<ApiResponse<{ interaction: InteractionStatus }>> {
  try {
    const query = authorId ? `?author_id=${encodeURIComponent(authorId)}` : "";
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/${articleId}/interaction${query}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch interaction status" },
    };
  }
}

export async function toggleFollowAuthor(
  token: string,
  username: string
): Promise<ApiResponse<{ following: boolean; follower_count: number }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/authors/${encodeURIComponent(username)}/follow`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FOLLOW_FAILED", message: error?.message || "Failed to toggle follow" },
    };
  }
}

export async function fetchArticleComments(
  articleId: string
): Promise<ApiResponse<{ comments: CommentThread[]; count: number }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/${articleId}/comments`, {
      method: "GET",
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch comments" },
    };
  }
}

export async function createComment(
  token: string,
  articleId: string,
  content: string,
  parentId?: string
): Promise<ApiResponse<{ comment: CommentDetail; message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/${articleId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
        parent_id: parentId || undefined,
      }),
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "COMMENT_FAILED", message: error?.message || "Failed to post comment" },
    };
  }
}

export async function updateComment(
  token: string,
  commentId: string,
  content: string
): Promise<ApiResponse<{ comment: CommentDetail; message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/comments/${commentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: error?.message || "Failed to update comment" },
    };
  }
}

export async function deleteComment(
  token: string,
  commentId: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "DELETE_FAILED", message: error?.message || "Failed to delete comment" },
    };
  }
}

export async function fetchFollowingFeed(
  token: string,
  page = 1,
  perPage = 10
): Promise<ApiResponse<{ articles: ArticleSummary[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/feed/following?page=${page}&per_page=${perPage}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FEED_FAILED", message: error?.message || "Failed to fetch following feed" },
    };
  }
}

export async function fetchBookmarks(
  token: string,
  page = 1,
  perPage = 10
): Promise<ApiResponse<{ bookmarks: BookmarkedArticle[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/library/bookmarks?page=${page}&per_page=${perPage}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "BOOKMARKS_FAILED", message: error?.message || "Failed to fetch bookmarks" },
    };
  }
}

export async function fetchNotifications(
  token: string,
  page = 1,
  perPage = 20
): Promise<ApiResponse<{ notifications: InAppNotificationItem[]; meta: { unread_count: number } }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications?page=${page}&per_page=${perPage}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "NOTIFICATIONS_FAILED", message: error?.message || "Failed to fetch notifications" },
    };
  }
}

export async function fetchUnreadNotificationCount(
  token: string
): Promise<ApiResponse<{ unread_count: number }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "COUNT_FAILED", message: error?.message || "Failed to fetch unread count" },
    };
  }
}

export async function markNotificationRead(
  token: string,
  id: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "MARK_FAILED", message: error?.message || "Failed to mark notification as read" },
    };
  }
}

export async function markAllNotificationsRead(
  token: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "MARK_ALL_FAILED", message: error?.message || "Failed to mark all as read" },
    };
  }
}

// --------------------------------------------------------------------------
// Phase 9: Search and Discovery
// --------------------------------------------------------------------------

export interface SearchParams {
  q?: string;
  type?: "all" | "articles" | "authors";
  category?: string;
  tag?: string;
  sort?: "relevance" | "latest" | "popular" | "trending";
  page?: number;
  per_page?: number;
}

export interface SearchResultData {
  query: string;
  type: string;
  articles: ArticleSummary[];
  authors: AuthorSummary[];
  articles_total: number;
  authors_total: number;
  meta: {
    page: number;
    per_page: number;
    total_pages: number;
    articles_total: number;
    authors_total: number;
  };
}

export async function globalSearch(
  params: SearchParams
): Promise<ApiResponse<SearchResultData>> {
  try {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set("q", params.q);
    if (params.type) queryParams.set("type", params.type);
    if (params.category) queryParams.set("category", params.category);
    if (params.tag) queryParams.set("tag", params.tag);
    if (params.sort) queryParams.set("sort", params.sort);
    if (params.page) queryParams.set("page", params.page.toString());
    if (params.per_page) queryParams.set("per_page", params.per_page.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/search?${queryParams.toString()}`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "SEARCH_FAILED", message: error?.message || "Search failed" },
    };
  }
}

export async function fetchPopularArticles(
  limit = 10
): Promise<ApiResponse<{ articles: ArticleSummary[]; count: number }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/articles/popular?limit=${limit}`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch popular articles" },
    };
  }
}

// --------------------------------------------------------------------------
// Phase 10: Super Admin Center, Audit Trail & Moderation
// --------------------------------------------------------------------------

export interface AdminDashboardStats {
  total_users: number;
  new_registrations_7d: number;
  new_registrations_30d: number;
  total_authors: number;
  published_articles: number;
  draft_articles: number;
  archived_articles: number;
  total_comments: number;
  total_views: number;
  daily_active_users: number;
  monthly_active_users: number;
  pending_reports: number;
}

export interface AdminUserSummary {
  id: string;
  email: string;
  role: "user" | "author" | "moderator" | "admin" | "super_admin";
  status: "pending_verification" | "active" | "suspended" | "deactivated";
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  article_count: number;
  follower_count: number;
  following_count: number;
}

export interface AdminUserDetail extends AdminUserSummary {
  bio?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  location?: string | null;
  active_sessions_count: number;
}

export interface AdminArticleSummary {
  id: string;
  author_id: string;
  category_id?: string | null;
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
  status: "draft" | "published" | "archived";
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
}

export interface AuditLogItem {
  id: string;
  actor_id?: string | null;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  details: any;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  actor_username?: string | null;
  actor_display_name?: string | null;
}

export interface ModerationReportItem {
  id: string;
  reporter_id?: string | null;
  target_type: "article" | "comment" | "user";
  target_id: string;
  reason: string;
  details?: string | null;
  status: "pending" | "reviewed" | "dismissed" | "action_taken";
  resolved_by?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  reporter_username?: string | null;
  reporter_display_name?: string | null;
  resolver_username?: string | null;
  resolver_display_name?: string | null;
}

export interface PlatformSettingItem {
  key: string;
  value: string;
  description?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export async function fetchAdminDashboard(
  token: string
): Promise<ApiResponse<{ stats: AdminDashboardStats }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch stats" } };
  }
}

export async function fetchAdminUsers(
  token: string,
  params: { q?: string; role?: string; status?: string; page?: number; per_page?: number }
): Promise<ApiResponse<{ users: AdminUserSummary[] }>> {
  try {
    const qp = new URLSearchParams();
    if (params.q) qp.set("q", params.q);
    if (params.role) qp.set("role", params.role);
    if (params.status) qp.set("status", params.status);
    if (params.page) qp.set("page", params.page.toString());
    if (params.per_page) qp.set("per_page", params.per_page.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/users?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch users" } };
  }
}

export async function fetchAdminUserDetail(
  token: string,
  id: string
): Promise<ApiResponse<{ user: AdminUserDetail }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch user" } };
  }
}

export async function updateAdminUserStatus(
  token: string,
  id: string,
  status: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "UPDATE_FAILED", message: error?.message || "Failed to update status" } };
  }
}

export async function updateAdminUserRole(
  token: string,
  id: string,
  role: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${id}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "UPDATE_FAILED", message: error?.message || "Failed to update role" } };
  }
}

export async function fetchAdminArticles(
  token: string,
  params: { q?: string; status?: string; page?: number; per_page?: number }
): Promise<ApiResponse<{ articles: AdminArticleSummary[] }>> {
  try {
    const qp = new URLSearchParams();
    if (params.q) qp.set("q", params.q);
    if (params.status) qp.set("status", params.status);
    if (params.page) qp.set("page", params.page.toString());
    if (params.per_page) qp.set("per_page", params.per_page.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/articles?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch articles" } };
  }
}

export async function toggleAdminFeatureArticle(
  token: string,
  id: string,
  featured: boolean
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/articles/${id}/feature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ featured }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "UPDATE_FAILED", message: error?.message || "Failed to toggle feature" } };
  }
}

export async function archiveAdminArticle(
  token: string,
  id: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/articles/${id}/archive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "ARCHIVE_FAILED", message: error?.message || "Failed to archive article" } };
  }
}

export async function fetchAdminAuditLogs(
  token: string,
  params: { action?: string; target_type?: string; page?: number; per_page?: number }
): Promise<ApiResponse<{ logs: AuditLogItem[] }>> {
  try {
    const qp = new URLSearchParams();
    if (params.action) qp.set("action", params.action);
    if (params.target_type) qp.set("target_type", params.target_type);
    if (params.page) qp.set("page", params.page.toString());
    if (params.per_page) qp.set("per_page", params.per_page.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/audit-logs?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch audit logs" } };
  }
}

export async function fetchAdminReports(
  token: string,
  params: { status?: string; target_type?: string; page?: number; per_page?: number }
): Promise<ApiResponse<{ reports: ModerationReportItem[] }>> {
  try {
    const qp = new URLSearchParams();
    if (params.status) qp.set("status", params.status);
    if (params.target_type) qp.set("target_type", params.target_type);
    if (params.page) qp.set("page", params.page.toString());
    if (params.per_page) qp.set("per_page", params.per_page.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch reports" } };
  }
}

export async function resolveAdminReport(
  token: string,
  id: string,
  status: string,
  notes?: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports/${id}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, notes }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "RESOLVE_FAILED", message: error?.message || "Failed to resolve report" } };
  }
}

export async function createContentReport(
  token: string,
  data: { target_type: string; target_id: string; reason: string; details?: string }
): Promise<ApiResponse<{ message: string; report: ModerationReportItem }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "REPORT_FAILED", message: error?.message || "Failed to create report" } };
  }
}

export async function fetchPlatformSettings(
  token: string
): Promise<ApiResponse<{ settings: PlatformSettingItem[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch settings" } };
  }
}

export async function updatePlatformSetting(
  token: string,
  key: string,
  value: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "UPDATE_FAILED", message: error?.message || "Failed to update setting" } };
  }
}

// --------------------------------------------------------------------------
// Phase 11: Platform and Author Analytics
// --------------------------------------------------------------------------

export interface MetricTimeseriesPoint {
  date: string;
  total_views: number;
  article_views?: number;
  unique_visitors: number;
}

export interface TrafficSourceBreakdown {
  source: string;
  count: number;
  percentage: number;
}

export interface TopCategoryMetric {
  id: string;
  name: string;
  slug: string;
  views_count: number;
  articles_count: number;
}

export interface TopArticleMetric {
  id: string;
  title: string;
  slug: string;
  author_username: string;
  author_display_name: string;
  views_count: number;
  unique_visitors: number;
}

export interface PlatformAnalyticsResult {
  range: string;
  start_date: string;
  end_date: string;
  total_events: number;
  total_page_views: number;
  total_article_views: number;
  unique_visitors: number;
  new_registrations: number;
  published_articles: number;
  comments_posted: number;
  likes_given: number;
  timeseries: MetricTimeseriesPoint[];
  traffic_sources: TrafficSourceBreakdown[];
  top_categories: TopCategoryMetric[];
  top_articles: TopArticleMetric[];
}

export interface AuthorArticlePerformanceItem {
  id: string;
  title: string;
  slug: string;
  reading_time_minutes: number;
  status: string;
  published_at?: string | null;
  views_count: number;
  unique_visitors: number;
  likes_count: number;
  bookmarks_count: number;
  comments_count: number;
}

export interface AuthorAnalyticsResult {
  range: string;
  start_date: string;
  end_date: string;
  total_views: number;
  unique_visitors: number;
  total_likes: number;
  total_bookmarks: number;
  total_comments: number;
  engagement_rate: number;
  timeseries: MetricTimeseriesPoint[];
  traffic_sources: TrafficSourceBreakdown[];
  articles: AuthorArticlePerformanceItem[];
}

export async function recordAnalyticsEvent(data: {
  event_type: string;
  path: string;
  article_id?: string;
  author_id?: string;
  token?: string;
}): Promise<ApiResponse<{ status: string }>> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (data.token) {
      headers["Authorization"] = `Bearer ${data.token}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/v1/analytics/collect`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event_type: data.event_type,
        path: data.path,
        article_id: data.article_id,
        author_id: data.author_id,
      }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "RECORD_FAILED", message: error?.message || "Failed to record event" } };
  }
}

export async function fetchPlatformAnalytics(
  token: string,
  params: { range?: string; from?: string; to?: string }
): Promise<ApiResponse<{ analytics: PlatformAnalyticsResult }>> {
  try {
    const qp = new URLSearchParams();
    if (params.range) qp.set("range", params.range);
    if (params.from) qp.set("from", params.from);
    if (params.to) qp.set("to", params.to);

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/analytics?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch analytics" } };
  }
}

export async function fetchAuthorAnalytics(
  token: string,
  params: { range?: string; from?: string; to?: string }
): Promise<ApiResponse<{ analytics: AuthorAnalyticsResult }>> {
  try {
    const qp = new URLSearchParams();
    if (params.range) qp.set("range", params.range);
    if (params.from) qp.set("from", params.from);
    if (params.to) qp.set("to", params.to);

    const res = await fetch(`${API_BASE_URL}/api/v1/studio/analytics?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch author analytics" } };
  }
}

// --------------------------------------------------------------------------
// Phase 12: Advertisement Management Telemetry & Operations
// --------------------------------------------------------------------------

export interface AdPayload {
  provider: string; // direct, adsense, disabled
  slot_key: string;
  format: string;
  campaign_id?: string;
  sponsor_label?: string;
  headline?: string;
  body?: string;
  cta_text?: string;
  target_url?: string;
  image_url?: string;
  adsense_client_id?: string;
  adsense_slot_id?: string;
  is_test_mode: boolean;
}

export interface AdPlacementResponse {
  placement_id: string;
  slot_key: string;
  name: string;
  page_type: string;
  provider: string;
  is_enabled: boolean;
  format: string;
  frequency_cap: number;
  payload?: AdPayload;
}

export interface AdPlacementItem {
  id: string;
  slot_key: string;
  name: string;
  page_type: string;
  provider: string;
  is_enabled: boolean;
  format: string;
  frequency_cap: number;
  config: any;
  created_at: string;
  updated_at: string;
}

export interface AdCampaignItem {
  id: string;
  name: string;
  advertiser: string;
  sponsor_label: string;
  headline: string;
  body: string;
  cta_text: string;
  target_url: string;
  image_url: string;
  format: string;
  placements: string[];
  status: string;
  cpm: number;
  cpc: number;
  start_date: string;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdTimeseriesPoint {
  date: string;
  impressions: number;
  clicks: number;
}

export interface AdPlacementStatItem {
  placement_id: string;
  slot_key: string;
  name: string;
  page_type: string;
  provider: string;
  is_enabled: boolean;
  impressions: number;
  clicks: number;
  ctr_percentage: number;
}

export interface AdCampaignStatItem {
  campaign_id: string;
  name: string;
  advertiser: string;
  sponsor_label: string;
  status: string;
  cpm: number;
  cpc: number;
  impressions: number;
  clicks: number;
  ctr_percentage: number;
  estimated_revenue: number;
}

export interface AdAnalyticsResult {
  range: string;
  start_date: string;
  end_date: string;
  total_impressions: number;
  total_clicks: number;
  ctr_percentage: number;
  estimated_direct_revenue: number;
  provider_reported_revenue: number;
  timeseries: AdTimeseriesPoint[];
  placements: AdPlacementStatItem[];
  campaigns: AdCampaignStatItem[];
}

export interface AdErrorLogItem {
  id: string;
  placement_key: string;
  provider: string;
  error_code: string;
  error_message: string;
  url: string;
  created_at: string;
}

export async function fetchAdPlacement(
  slotKey: string
): Promise<ApiResponse<{ placement: AdPlacementResponse }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ads/placements/${slotKey}`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch ad placement" },
    };
  }
}

export async function recordAdImpression(data: {
  placement_id: string;
  campaign_id?: string;
  provider: string;
  path: string;
}): Promise<ApiResponse<{ status: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ads/impressions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "IMPRESSION_FAILED", message: error?.message || "Failed to record impression" },
    };
  }
}

export async function recordAdClick(data: {
  placement_id: string;
  campaign_id?: string;
  provider: string;
  target_url: string;
}): Promise<ApiResponse<{ status: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ads/clicks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "CLICK_FAILED", message: error?.message || "Failed to record click" },
    };
  }
}

export async function recordAdError(data: {
  placement_key: string;
  provider: string;
  error_code: string;
  error_message: string;
  url: string;
}): Promise<ApiResponse<{ status: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/ads/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "ERROR_LOG_FAILED", message: error?.message || "Failed to log ad error" },
    };
  }
}

// Admin Advertising APIs
export async function fetchAdminAdPlacements(
  token: string
): Promise<ApiResponse<{ placements: AdPlacementItem[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/placements`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch placements" } };
  }
}

export async function updateAdminAdPlacement(
  token: string,
  id: string,
  data: Partial<AdPlacementItem>
): Promise<ApiResponse<{ placement: AdPlacementItem }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/placements/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "UPDATE_FAILED", message: error?.message || "Failed to update placement" } };
  }
}

export async function fetchAdminAdCampaigns(
  token: string
): Promise<ApiResponse<{ campaigns: AdCampaignItem[] }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/campaigns`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch campaigns" } };
  }
}

export async function createAdminAdCampaign(
  token: string,
  data: any
): Promise<ApiResponse<{ campaign: AdCampaignItem }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "CREATE_FAILED", message: error?.message || "Failed to create campaign" } };
  }
}

export async function updateAdminAdCampaign(
  token: string,
  id: string,
  data: any
): Promise<ApiResponse<{ campaign: AdCampaignItem }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/campaigns/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "UPDATE_FAILED", message: error?.message || "Failed to update campaign" } };
  }
}

export async function deleteAdminAdCampaign(
  token: string,
  id: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/campaigns/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "DELETE_FAILED", message: error?.message || "Failed to delete campaign" } };
  }
}

export async function fetchAdminAdAnalytics(
  token: string,
  params: { range?: string; from?: string; to?: string }
): Promise<ApiResponse<{ analytics: AdAnalyticsResult }>> {
  try {
    const qp = new URLSearchParams();
    if (params.range) qp.set("range", params.range);
    if (params.from) qp.set("from", params.from);
    if (params.to) qp.set("to", params.to);

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/analytics?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch ad analytics" } };
  }
}

export async function fetchAdminAdErrors(
  token: string,
  params?: { limit?: number; offset?: number }
): Promise<ApiResponse<{ errors: AdErrorLogItem[] }>> {
  try {
    const qp = new URLSearchParams();
    if (params?.limit) qp.set("limit", params.limit.toString());
    if (params?.offset) qp.set("offset", params.offset.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/errors?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch ad errors" } };
  }
}

export async function recordAdminProviderRevenue(
  token: string,
  data: {
    provider: string;
    date: string;
    reported_impressions: number;
    reported_clicks: number;
    reported_revenue: number;
    currency?: string;
  }
): Promise<ApiResponse<{ provider_revenue: any }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/ads/provider-revenue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: { code: "SAVE_FAILED", message: error?.message || "Failed to record provider revenue" } };
  }
}

// --------------------------------------------------------------------------
// Phase 13: Platform Operations, Monitoring & Health Telemetry
// --------------------------------------------------------------------------

export interface RuntimeMetrics {
  uptime_seconds: number;
  go_version: string;
  os: string;
  arch: string;
  num_cpu: number;
  num_goroutines: number;
  alloc_mb: number;
  total_alloc_mb: number;
  sys_mb: number;
  heap_alloc_mb: number;
  num_gc: number;
}

export interface TableSizeEntry {
  table_name: string;
  total_size: string;
  total_bytes: number;
  row_estimate: number;
}

export interface DatabaseMetrics {
  status: string;
  ping_latency_ms: number;
  total_conns: number;
  idle_conns: number;
  acquired_conns: number;
  max_conns: number;
  database_size: string;
  database_bytes: number;
  top_table_sizes?: TableSizeEntry[];
}

export interface RedisMetrics {
  status: string;
  ping_latency_ms: number;
  enabled: boolean;
}

export interface WorkerMetrics {
  worker_status: string;
  ses_mode: string;
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  total: number;
}

export interface StorageMetrics {
  provider: string;
  status: string;
  bucket?: string;
  region?: string;
}

export interface APITelemetryMetrics {
  total_requests: number;
  status_2xx: number;
  status_3xx: number;
  status_4xx: number;
  status_5xx: number;
  error_rate_percent: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
}

export interface SystemHealthOverview {
  overall_status: string;
  timestamp: string;
  runtime: RuntimeMetrics;
  database: DatabaseMetrics;
  redis: RedisMetrics;
  workers: WorkerMetrics;
  storage: StorageMetrics;
  api_telemetry: APITelemetryMetrics;
}

export interface FailedJobItem {
  id: string;
  recipient_email: string;
  template_name: string;
  subject: string;
  status: string;
  retry_count: number;
  max_retries: number;
  last_error: string;
  created_at: string;
  updated_at: string;
}

export async function fetchSystemHealth(
  token: string
): Promise<ApiResponse<{ health: SystemHealthOverview }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/operations/health`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch operational health" },
    };
  }
}

export async function fetchFailedJobs(
  token: string,
  params?: { limit?: number; offset?: number }
): Promise<ApiResponse<{ failed_jobs: FailedJobItem[] }>> {
  try {
    const qp = new URLSearchParams();
    if (params?.limit) qp.set("limit", params.limit.toString());
    if (params?.offset) qp.set("offset", params.offset.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/admin/operations/failed-jobs?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "FETCH_FAILED", message: error?.message || "Failed to fetch failed jobs" },
    };
  }
}

export async function retryFailedJob(
  token: string,
  id: string
): Promise<ApiResponse<{ status: string; job?: any }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/operations/retry-job/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "RETRY_FAILED", message: error?.message || "Failed to retry job" },
    };
  }
}

export async function retryAllFailedJobs(
  token: string
): Promise<ApiResponse<{ status: string; message: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin/operations/retry-all-jobs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (error: any) {
    return {
      success: false,
      error: { code: "RETRY_FAILED", message: error?.message || "Failed to retry all jobs" },
    };
  }
}
