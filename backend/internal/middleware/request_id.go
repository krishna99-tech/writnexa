package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const HeaderRequestID = "X-Request-ID"

// RequestID attaches an X-Request-ID header to every incoming HTTP request.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		reqID := c.GetHeader(HeaderRequestID)
		if reqID == "" {
			reqID = uuid.NewString()
		}
		c.Set(HeaderRequestID, reqID)
		c.Header(HeaderRequestID, reqID)
		c.Next()
	}
}

