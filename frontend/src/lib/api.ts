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
