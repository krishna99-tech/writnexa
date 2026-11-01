package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/response"
)

type clientBucket struct {
	tokens     float64
	lastUpdate time.Time
}

// RateLimiter implements a token bucket rate limiter in memory.
type RateLimiter struct {
	mu         sync.Mutex
	buckets    map[string]*clientBucket
	rate       float64 // tokens per second
	capacity   float64 // max burst capacity
	cleanupDur time.Duration
}

// NewRateLimiter creates a rate limiter with requests-per-minute limit and burst capacity.
func NewRateLimiter(requestsPerMinute float64, burstCapacity float64) *RateLimiter {
	rl := &RateLimiter{
		buckets:    make(map[string]*clientBucket),
		rate:       requestsPerMinute / 60.0,
		capacity:   burstCapacity,
		cleanupDur: 10 * time.Minute,
	}

	go rl.cleanupLoop()
	return rl
}

func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(rl.cleanupDur)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, bucket := range rl.buckets {
			if now.Sub(bucket.lastUpdate) > rl.cleanupDur {
				delete(rl.buckets, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// Limit returns a Gin middleware enforcing the rate limit.
func (rl *RateLimiter) Limit() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		rl.mu.Lock()
		bucket, exists := rl.buckets[ip]
		if !exists {
			bucket = &clientBucket{
				tokens:     rl.capacity - 1.0,
				lastUpdate: now,
			}
			rl.buckets[ip] = bucket
			rl.mu.Unlock()
			c.Next()
			return
		}

		// Refill tokens based on elapsed time
		elapsed := now.Sub(bucket.lastUpdate).Seconds()
		bucket.tokens += elapsed * rl.rate
		if bucket.tokens > rl.capacity {
			bucket.tokens = rl.capacity
		}
		bucket.lastUpdate = now

		if bucket.tokens < 1.0 {
			rl.mu.Unlock()
			response.Error(
				c,
				http.StatusTooManyRequests,
				"RATE_LIMIT_EXCEEDED",
				"Too many requests. Please wait a moment before trying again.",
			)
			c.Abort()
			return
		}

		bucket.tokens -= 1.0
		rl.mu.Unlock()

		c.Next()
	}
}
