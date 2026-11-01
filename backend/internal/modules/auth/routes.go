package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/middleware"
)

// RegisterRoutes sets up all authentication and session endpoints.
func RegisterRoutes(r *gin.RouterGroup, h *Handler, cfg *config.Config) {
	// Independent endpoint rate limiters
	registerLimiter := middleware.NewRateLimiter(10.0, 10.0)
	loginLimiter := middleware.NewRateLimiter(30.0, 20.0)
	recoveryLimiter := middleware.NewRateLimiter(10.0, 10.0)

	authGroup := r.Group("/auth")
	{
		// Public Auth Endpoints
		authGroup.POST("/register", registerLimiter.Limit(), h.Register)
		authGroup.POST("/login", loginLimiter.Limit(), h.Login)
		authGroup.POST("/refresh", h.RefreshToken)
		authGroup.POST("/logout", h.Logout)
		authGroup.POST("/verify-email", h.VerifyEmail)
		authGroup.POST("/resend-verification", recoveryLimiter.Limit(), h.ResendVerification)
		authGroup.POST("/forgot-password", recoveryLimiter.Limit(), h.ForgotPassword)
		authGroup.POST("/reset-password", h.ResetPassword)

		// Protected Auth & Session Management Endpoints
		protected := authGroup.Group("")
		protected.Use(middleware.Authenticate(cfg.JWT.AccessSecret))
		{
			protected.GET("/me", h.GetMe)
			protected.POST("/change-password", h.ChangePassword)
			protected.GET("/sessions", h.ListSessions)
			protected.DELETE("/sessions/:id", h.RevokeSession)
		}
	}
}
