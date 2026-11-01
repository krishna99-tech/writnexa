package community

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes registers all community, social, and notification endpoints.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	// Public comments endpoint (Guests can read discussions without authentication)
	// Uses :slug wildcard matching content.RegisterRoutes to avoid Gin radix tree conflict
	r.GET("/articles/:slug/comments", h.ListComments)

	// Public Newsletter Subscription Endpoints
	newsletter := r.Group("/newsletter")
	{
		newsletter.POST("/subscribe", h.SubscribeNewsletter)
		newsletter.POST("/unsubscribe", h.UnsubscribeNewsletter)
	}

	// Protected Community Endpoints
	authMW := middleware.Authenticate(cfg.JWT.AccessSecret)

	// Article Social Interactions
	articles := r.Group("/articles")
	articles.Use(authMW)
	{
		articles.POST("/:slug/like", h.ToggleLike)
		articles.POST("/:slug/bookmark", h.ToggleBookmark)
		articles.GET("/:slug/interaction", h.GetInteractionStatus)
		articles.POST("/:slug/comments", h.CreateComment)
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

