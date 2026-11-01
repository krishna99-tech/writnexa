package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/response"
)

// Recovery catches panics and responds with a standardized internal server error JSON.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				reqID := c.GetString(HeaderRequestID)
				stack := string(debug.Stack())

				slog.Error("Unhandled panic recovered",
					slog.String("request_id", reqID),
					slog.String("panic", fmt.Sprintf("%v", r)),
					slog.String("stack", stack),
				)

				response.Error(
					c,
					http.StatusInternalServerError,
					"INTERNAL_SERVER_ERROR",
					"An internal server error occurred. Please contact platform support.",
				)
				c.Abort()
			}
		}()
		c.Next()
	}
}
