package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
)

// CORS handles Cross-Origin Resource Sharing.
func CORS(cfg config.CORSConfig) gin.HandlerFunc {
	allowedOriginsMap := make(map[string]bool)
	for _, origin := range cfg.AllowedOrigins {
		allowedOriginsMap[strings.TrimSpace(origin)] = true
	}

	methods := strings.Join(cfg.AllowedMethods, ", ")
	headers := strings.Join(cfg.AllowedHeaders, ", ")

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if origin != "" && (allowedOriginsMap[origin] || allowedOriginsMap["*"]) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", methods)
			c.Header("Access-Control-Allow-Headers", headers)
			c.Header("Access-Control-Expose-Headers", "Content-Length, X-Request-ID")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

