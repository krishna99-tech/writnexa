package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/response"
)

var roleWeight = map[string]int{
	"user":        1,
	"author":      2,
	"moderator":   3,
	"admin":       4,
	"super_admin": 5,
}

// RequireRole ensures the authenticated user has at least one of the required roles or a higher role.
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	minWeight := 100
	for _, r := range allowedRoles {
		if w, ok := roleWeight[r]; ok && w < minWeight {
			minWeight = w
		}
	}

	return func(c *gin.Context) {
		roleVal, exists := c.Get(ContextRole)
		if !exists {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required.")
			c.Abort()
			return
		}

		userRole, _ := roleVal.(string)
		userWeight, ok := roleWeight[userRole]
		if !ok || userWeight < minWeight {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "You do not have permission to access this resource.")
			c.Abort()
			return
		}

		c.Next()
	}
}
