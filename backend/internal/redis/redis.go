package redis

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/quorix/quorix-backend/internal/config"
	"github.com/redis/go-redis/v9"
)

type Client struct {
	RDB     *redis.Client
	Enabled bool
}

// Connect initializes a Redis client connection if enabled.
func Connect(ctx context.Context, cfg config.RedisConfig) (*Client, error) {
	if !cfg.Enabled {
		slog.Info("Redis is disabled by configuration")
		return &Client{Enabled: false}, nil
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr(),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := rdb.Ping(pingCtx).Err(); err != nil {
		slog.Warn("Redis ping failed during startup; continuing in degraded mode",
			slog.String("addr", cfg.Addr()),
			slog.String("error", err.Error()),
		)
		return &Client{RDB: rdb, Enabled: true}, nil
	}

	slog.Info("Redis connection established", slog.String("addr", cfg.Addr()))
	return &Client{RDB: rdb, Enabled: true}, nil
}

// Ping checks if Redis is reachable.
func (c *Client) Ping(ctx context.Context) error {
	if !c.Enabled || c.RDB == nil {
		return fmt.Errorf("redis is disabled or uninitialized")
	}
	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return c.RDB.Ping(pingCtx).Err()
}

// Close gracefully closes the Redis connection.
func (c *Client) Close() {
	if c.RDB != nil {
		if err := c.RDB.Close(); err != nil {
			slog.Warn("Error closing Redis connection", slog.String("error", err.Error()))
		}
	}
}

