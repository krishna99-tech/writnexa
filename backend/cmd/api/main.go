package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/quorix/quorix-backend/internal/config"
	"github.com/quorix/quorix-backend/internal/database"
	"github.com/quorix/quorix-backend/internal/health"
	"github.com/quorix/quorix-backend/internal/logger"
	"github.com/quorix/quorix-backend/internal/middleware"
	"github.com/quorix/quorix-backend/internal/redis"
	"github.com/quorix/quorix-backend/internal/response"
)

const AppVersion = "1.0.0"

func main() {
	// 1. Load strongly typed configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Critical: failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// 2. Initialize structured logging
	logger.Init(cfg.App.Env, cfg.App.LogLevel)
	slog.Info("Starting QUORIX API Backend",
		slog.String("version", AppVersion),
		slog.String("environment", cfg.App.Env),
		slog.Int("port", cfg.App.Port),
	)

	// 3. Connect to PostgreSQL
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.Connect(ctx, cfg.Database)
	if err != nil {
		slog.Warn("PostgreSQL connection could not be established; starting in degraded mode",
			slog.String("error", err.Error()),
		)
	} else {
		defer db.Close()
		// Try running migrations
		migrationsDir := "migrations"
		if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
			migrationsDir = "../migrations"
		}
		if err := database.RunMigrations(cfg.Database, migrationsDir); err != nil {
			slog.Warn("Migration step encountered an issue", slog.String("error", err.Error()))
		}
	}

	// 4. Connect to Redis (optional)
	redisClient, err := redis.Connect(ctx, cfg.Redis)
	if err != nil {
		slog.Warn("Redis initialization error", slog.String("error", err.Error()))
	}
	defer redisClient.Close()

	// 5. Configure Gin HTTP engine
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	router := gin.New()

	// 6. Global Middlewares
	router.Use(middleware.RequestID())
	router.Use(middleware.Logger())
	router.Use(middleware.Recovery())
	router.Use(middleware.CORS(cfg.CORS))

	// 7. Handlers & Routes
	healthHandler := health.NewHandler(db, redisClient, AppVersion)

	// Root health endpoints
	router.GET("/health", healthHandler.Check)

	// API v1 group
	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", healthHandler.Check)
		v1.GET("/ping", func(c *gin.Context) {
			response.JSON(c, http.StatusOK, gin.H{
				"message": "pong",
				"time":    time.Now().UTC(),
			})
		})
	}

	// 8. Server setup & Graceful shutdown
	serverAddr := fmt.Sprintf(":%d", cfg.App.Port)
	srv := &http.Server{
		Addr:         serverAddr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Run server in background goroutine
	go func() {
		slog.Info("HTTP server listening", slog.String("address", serverAddr))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("HTTP server failed to listen", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	// Wait for interrupt signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	slog.Info("Termination signal received; initiating graceful shutdown", slog.String("signal", sig.String()))

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced to shutdown", slog.String("error", err.Error()))
	}

	slog.Info("QUORIX API Backend terminated gracefully")
}
