"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  toggleLike,
  toggleBookmark,
  fetchInteractionStatus,
  fetchArticleComments,
  createComment,
  updateComment,
  deleteComment,
  CommentThread,
  CommentDetail,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Bookmark,
  Share2,
  MessageSquare,
  Reply,
  Edit2,
  Trash2,
  Check,
  Send,
  CornerDownRight,
  User,
  Clock,
  Sparkles,
} from "lucide-react";

interface ArticleInteractionsProps {
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  authorId: string;
  initialLikesCount: number;
  initialBookmarksCount: number;
  initialCommentsCount: number;
}

export function ArticleActionsBar({
  articleId,
  articleSlug,
  articleTitle,
  authorId,
  initialLikesCount,
  initialBookmarksCount,
  initialCommentsCount,
}: ArticleInteractionsProps) {
  const router = useRouter();
  const { user, accessToken } = useAuth();

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarksCount, setBookmarksCount] = useState(initialBookmarksCount);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch initial interaction status if user is authenticated
  useEffect(() => {
    if (!accessToken || !articleId) return;

    fetchInteractionStatus(accessToken, articleId, authorId).then((res) => {
      if (res.success && res.data?.interaction) {
        setLiked(res.data.interaction.liked);
        setBookmarked(res.data.interaction.bookmarked);
      }
    });
  }, [accessToken, articleId, authorId]);

  const handleLike = async () => {
    if (!user || !accessToken) {
      router.push(`/login?return_to=/article/${articleSlug}`);
      return;
    }
    if (isLiking) return;

    // Optimistic update
    const prevLiked = liked;
    const prevCount = likesCount;
    setLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    setIsLiking(true);

    const res = await toggleLike(accessToken, articleId);
    setIsLiking(false);

    if (res.success && res.data) {
      setLiked(res.data.liked);
      setLikesCount(res.data.likes_count);
    } else {
      // Revert on error
      setLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const handleBookmark = async () => {
    if (!user || !accessToken) {
      router.push(`/login?return_to=/article/${articleSlug}`);
      return;
    }
    if (isBookmarking) return;

    // Optimistic update
    const prevBookmarked = bookmarked;
    const prevCount = bookmarksCount;
    setBookmarked(!prevBookmarked);
    setBookmarksCount(
      prevBookmarked ? Math.max(0, prevCount - 1) : prevCount + 1
    );
    setIsBookmarking(true);

    const res = await toggleBookmark(accessToken, articleId);
    setIsBookmarking(false);

    if (res.success && res.data) {
      setBookmarked(res.data.bookmarked);
      setBookmarksCount(res.data.bookmarks_count);
    } else {
      // Revert on error
      setBookmarked(prevBookmarked);
      setBookmarksCount(prevCount);
    }
  };

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };

  const scrollToComments = () => {
    const el = document.getElementById("article-comments");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {/* Like Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLike}
          disabled={isLiking}
          className={`gap-1.5 font-mono text-xs transition-all ${
            liked
              ? "bg-rose-950/40 border-rose-600 text-rose-400 hover:bg-rose-950/60"
              : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
          }`}
          title={user ? (liked ? "Unlike article" : "Like article") : "Sign in to like"}
        >
          <Heart
            className={`w-4 h-4 transition-transform ${
              liked ? "fill-rose-500 text-rose-500 scale-110" : "text-rose-400"
            }`}
          />
          <span>{likesCount}</span>
        </Button>

        {/* Bookmark Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleBookmark}
          disabled={isBookmarking}
          className={`gap-1.5 font-mono text-xs transition-all ${
            bookmarked
              ? "bg-amber-950/40 border-amber-600 text-amber-400 hover:bg-amber-950/60"
              : "border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
          }`}
          title={user ? (bookmarked ? "Remove bookmark" : "Save bookmark") : "Sign in to bookmark"}
        >
          <Bookmark
            className={`w-4 h-4 transition-transform ${
              bookmarked ? "fill-amber-500 text-amber-500 scale-110" : "text-amber-400"
            }`}
          />
          <span className="hidden sm:inline">Save</span>
        </Button>

        {/* Comments Jump Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={scrollToComments}
          className="gap-1.5 font-mono text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>{initialCommentsCount}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Copy Link / Share Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="gap-1.5 font-mono text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Threaded Comments Component
// --------------------------------------------------------------------------

export function ArticleCommentsSection({
  articleId,
  articleSlug,
}: {
  articleId: string;
  articleSlug: string;
}) {
  const router = useRouter();
  const { user, profile, accessToken } = useAuth();

  const [comments, setComments] = useState<CommentThread[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchArticleComments(articleId);
    setIsLoading(false);
    if (res.success && res.data) {
      setComments(res.data.comments || []);
      // Calculate total including nested replies
      let count = res.data.comments.length;
      res.data.comments.forEach((c) => {
        if (c.replies) count += c.replies.length;
      });
      setTotalCount(count);
    }
  }, [articleId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user || !accessToken) {
      router.push(`/login?return_to=/article/${articleSlug}#article-comments`);
      return;
    }

    const trimmed = newContent.trim();
    if (trimmed.length < 2) {
      setErrorMsg("Comment must be at least 2 characters long.");
      return;
    }

    setIsSubmitting(true);
    const res = await createComment(accessToken, articleId, trimmed);
    setIsSubmitting(false);

    if (res.success && res.data?.comment) {
      setNewContent("");
      loadComments();
    } else {
      setErrorMsg(res.error?.message || "Failed to post comment");
    }
  };

  const handlePostReply = async (parentId: string) => {
    setErrorMsg(null);
    if (!user || !accessToken) {
      router.push(`/login?return_to=/article/${articleSlug}#article-comments`);
      return;
    }

    const trimmed = replyContent.trim();
    if (trimmed.length < 2) {
      setErrorMsg("Reply must be at least 2 characters long.");
      return;
    }

    setIsSubmittingReply(true);
    const res = await createComment(accessToken, articleId, trimmed, parentId);
    setIsSubmittingReply(false);

    if (res.success) {
      setReplyingToId(null);
      setReplyContent("");
      loadComments();
    } else {
      setErrorMsg(res.error?.message || "Failed to post reply");
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    setErrorMsg(null);
    if (!accessToken) return;

    const trimmed = editContent.trim();
    if (trimmed.length < 2) {
      setErrorMsg("Content must be at least 2 characters long.");
      return;
    }

    const res = await updateComment(accessToken, commentId, trimmed);
    if (res.success) {
      setEditingId(null);
      setEditContent("");
      loadComments();
    } else {
      setErrorMsg(res.error?.message || "Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!accessToken) return;
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    const res = await deleteComment(accessToken, commentId);
    if (res.success) {
      loadComments();
    } else {
      alert(res.error?.message || "Failed to delete comment");
    }
  };

  return (
    <section id="article-comments" className="space-y-6 pt-8 border-t border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">
            Discussion & Responses ({totalCount})
          </h2>
        </div>
        <span className="text-xs font-mono text-zinc-500">
          Threaded &bull; Markdown Supported
        </span>
      </div>

      {/* New Top-Level Comment Box */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
        {user ? (
          <form onSubmit={handlePostComment} className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Commenting as @{profile?.username || "authenticated_user"}</span>
            </div>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Join the discussion... Share technical feedback, architectural questions, or related experience (Markdown supported)"
              rows={3}
              className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-sans text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-y"
            />
            {errorMsg && (
              <p className="text-xs font-mono text-rose-400">{errorMsg}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-mono">
                Min 2 chars &bull; Max 2000 chars
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || newContent.trim().length < 2}
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold gap-1.5 font-mono text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Posting..." : "Post Comment"}</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
            <div>
              <p className="text-sm font-semibold text-zinc-200">
                Want to join the conversation?
              </p>
              <p className="text-xs text-zinc-400 font-sans">
                Guests can read all technical discussions. Sign in to post comments and interact.
              </p>
            </div>
            <Link href={`/login?return_to=/article/${articleSlug}#article-comments`}>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold font-mono text-xs"
              >
                Sign In to Participate &rarr;
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Comment List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800" />
                <div className="w-32 h-4 rounded bg-zinc-800" />
              </div>
              <div className="w-full h-12 rounded bg-zinc-800/60" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-zinc-800 text-zinc-500 space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm font-sans">No comments yet.</p>
          <p className="text-xs font-mono text-zinc-600">
            Be the first engineer to leave a response!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((thread) => (
            <div
              key={thread.id}
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-4"
            >
              {/* Parent Comment Item */}
              <SingleCommentItem
                comment={thread}
                currentUserId={user?.id}
                onReply={() => {
                  setReplyingToId(replyingToId === thread.id ? null : thread.id);
                  setReplyContent("");
                }}
                onEdit={() => {
                  setEditingId(editingId === thread.id ? null : thread.id);
                  setEditContent(thread.content);
                }}
                onDelete={() => handleDeleteComment(thread.id)}
              />

              {/* Editing Form for Parent Comment */}
              {editingId === thread.id && (
                <div className="pl-10 space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-sans text-zinc-200"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateComment(thread.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono text-xs h-7"
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                      className="text-zinc-400 font-mono text-xs h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Inline Reply Form for Parent */}
              {replyingToId === thread.id && (
                <div className="pl-10 pt-2 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Replying to @{thread.username}</span>
                  </div>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a constructive technical reply..."
                    rows={2}
                    className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-sans text-zinc-200"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePostReply(thread.id)}
                      disabled={isSubmittingReply || replyContent.trim().length < 2}
                      className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono text-xs h-7"
                    >
                      {isSubmittingReply ? "Replying..." : "Submit Reply"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingToId(null)}
                      className="text-zinc-400 font-mono text-xs h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Nested Replies */}
              {thread.replies && thread.replies.length > 0 && (
                <div className="pl-6 sm:pl-10 space-y-3 border-l-2 border-zinc-800/80 ml-3">
                  {thread.replies.map((reply) => (
                    <div key={reply.id} className="space-y-2 pt-2">
                      <SingleCommentItem
                        comment={reply}
                        currentUserId={user?.id}
                        isReply
                        onReply={() => {
                          setReplyingToId(replyingToId === thread.id ? null : thread.id);
                          setReplyContent(`@${reply.username} `);
                        }}
                        onEdit={() => {
                          setEditingId(editingId === reply.id ? null : reply.id);
                          setEditContent(reply.content);
                        }}
                        onDelete={() => handleDeleteComment(reply.id)}
                      />

                      {editingId === reply.id && (
                        <div className="pl-10 space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-sans text-zinc-200"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateComment(reply.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono text-xs h-7"
                            >
                              Save Changes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              className="text-zinc-400 font-mono text-xs h-7"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// --------------------------------------------------------------------------
// Single Comment Item Renderer
// --------------------------------------------------------------------------

function SingleCommentItem({
  comment,
  currentUserId,
  isReply = false,
  onReply,
  onEdit,
  onDelete,
}: {
  comment: CommentDetail;
  currentUserId?: string;
  isReply?: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isAuthor = currentUserId === comment.author_id;

  const dateStr = comment.created_at
    ? new Date(comment.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link
            href={`/author/${comment.username}`}
            className="flex items-center gap-2 group"
          >
            {comment.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={comment.avatar_url}
                alt={comment.display_name}
                className="w-7 h-7 rounded-full object-cover border border-zinc-700 group-hover:border-emerald-500 transition-colors"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-emerald-400">
                {comment.display_name?.[0] || comment.username?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <span className="font-semibold text-xs text-zinc-200 group-hover:text-emerald-400 transition-colors">
              {comment.display_name || comment.username}
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              @{comment.username}
            </span>
          </Link>
          <span className="text-zinc-600 font-mono text-xs">&bull;</span>
          <span className="text-[11px] font-mono text-zinc-500">{dateStr}</span>
          {comment.is_edited && !comment.is_deleted && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1 font-mono border-zinc-800 text-zinc-500"
            >
              edited
            </Badge>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {!comment.is_deleted && (
            <button
              onClick={onReply}
              className="text-xs font-mono text-zinc-400 hover:text-emerald-400 flex items-center gap-1 p-1 rounded hover:bg-zinc-800 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reply</span>
            </button>
          )}

          {isAuthor && !comment.is_deleted && (
            <>
              <button
                onClick={onEdit}
                className="text-xs font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 p-1 rounded hover:bg-zinc-800 transition-colors"
                title="Edit Comment"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="text-xs font-mono text-zinc-400 hover:text-rose-400 flex items-center gap-1 p-1 rounded hover:bg-zinc-800 transition-colors"
                title="Delete Comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="text-sm font-sans text-zinc-300 leading-relaxed pl-9">
        {comment.is_deleted ? (
          <span className="italic text-zinc-600 font-mono text-xs">
            [This comment has been deleted]
          </span>
        ) : (
          <p className="whitespace-pre-line">{comment.content}</p>
        )}
      </div>
    </div>
  );
}

