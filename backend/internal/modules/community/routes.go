package community

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes registers all community, social, and notification endpoints.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	// Public comments endpoint (Guests can read discussions without authentication)
	r.GET("/articles/:id/comments", h.ListComments)

	// Protected Community Endpoints
	authMW := middleware.Authenticate(cfg.JWT.AccessSecret)

	// Article Social Interactions
	articles := r.Group("/articles")
	articles.Use(authMW)
	{
		articles.POST("/:id/like", h.ToggleLike)
		articles.POST("/:id/bookmark", h.ToggleBookmark)
		articles.GET("/:id/interaction", h.GetInteractionStatus)
		articles.POST("/:id/comments", h.CreateComment)
	}

	// Comment Modifications
	comments := r.Group("/comments")
	comments.Use(authMW)
	{
		comments.PUT("/:id", h.UpdateComment)
		comments.DELETE("/:id", h.DeleteComment)
	}

	// Author Follow Actions
	authors := r.Group("/authors")
	authors.Use(authMW)
	{
		authors.POST("/:username/follow", h.ToggleFollow)
	}

	// Following Feed
	feed := r.Group("/feed")
	feed.Use(authMW)
	{
		feed.GET("/following", h.ListFollowingFeed)
	}

	// Bookmarks Library
	library := r.Group("/library")
	library.Use(authMW)
	{
		library.GET("/bookmarks", h.ListBookmarks)
	}

	// In-App Notification Center
	notifications := r.Group("/notifications")
	notifications.Use(authMW)
	{
		notifications.GET("", h.ListNotifications)
		notifications.GET("/unread-count", h.GetUnreadCount)
		notifications.POST("/:id/read", h.MarkNotificationRead)
		notifications.POST("/read-all", h.MarkAllNotificationsRead)
	}
}

