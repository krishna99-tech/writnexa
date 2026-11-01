package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRBAC_Hierarchy(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		userRole     string
		requiredRole string
		expectedCode int
	}{
		{"User accessing user route", "user", "user", http.StatusOK},
		{"User accessing author route", "user", "author", http.StatusForbidden},
		{"Author accessing author route", "author", "author", http.StatusOK},
		{"Author accessing admin route", "author", "admin", http.StatusForbidden},
		{"Admin accessing author route", "admin", "author", http.StatusOK},
		{"Admin accessing admin route", "admin", "admin", http.StatusOK},
		{"Admin accessing super_admin route", "admin", "super_admin", http.StatusForbidden},
		{"Super admin accessing everything", "super_admin", "admin", http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := gin.New()
			r.Use(func(c *gin.Context) {
				c.Set(ContextRole, tt.userRole)
				c.Next()
			})
			r.GET("/protected", RequireRole(tt.requiredRole), func(c *gin.Context) {
				c.JSON(http.StatusOK, gin.H{"status": "ok"})
			})

			w := httptest.NewRecorder()
			req, _ := http.NewRequest(http.MethodGet, "/protected", nil)
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedCode, w.Code)
		})
	}
}

func TestRateLimiter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	limiter := NewRateLimiter(60.0, 3.0) // 3 burst tokens max

	r := gin.New()
	r.GET("/test", limiter.Limit(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// First 3 requests should pass
	for i := 0; i < 3; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/test", nil)
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	}

	// 4th burst request should be rate-limited (429)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/test", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusTooManyRequests, w.Code)

	// Sleep slightly or check error format
	assert.Contains(t, w.Body.String(), "RATE_LIMIT_EXCEEDED")
}
