package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quorix/quorix-backend/internal/response"
	"github.com/quorix/quorix-backend/internal/security"
)

const (
	ContextUserID = "user_id"
	ContextEmail  = "email"
	ContextRole   = "role"
)

// Authenticate validates the short-lived JWT access token in the Authorization header.
func Authenticate(accessSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Missing authorization header. Please log in.")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authorization format. Expected 'Bearer <token>'.")
			c.Abort()
			return
		}

		tokenStr := strings.TrimSpace(parts[1])
		claims, err := security.VerifyAccessToken(tokenStr, accessSecret)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "TOKEN_EXPIRED_OR_INVALID", "Your session has expired or is invalid. Please refresh or log in again.")
			c.Abort()
			return
		}

		// Inject into Gin context
		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextEmail, claims.Email)
		c.Set(ContextRole, claims.Role)

		c.Next()
	}
}

// OptionalAuthenticate extracts user if present without failing the request if unauthenticated.
func OptionalAuthenticate(accessSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				if claims, err := security.VerifyAccessToken(strings.TrimSpace(parts[1]), accessSecret); err == nil {
					c.Set(ContextUserID, claims.UserID)
					c.Set(ContextEmail, claims.Email)
					c.Set(ContextRole, claims.Role)
				}
			}
		}
		c.Next()
	}
}

// GetAuthenticatedUserID retrieves the current user UUID from context.
func GetAuthenticatedUserID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(ContextUserID)
	if !exists {
		return uuid.Nil, false
	}
	id, ok := val.(uuid.UUID)
	return id, ok
}

