package database

import (
	"database/sql"
	"fmt"
	"log/slog"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"github.com/quorix/quorix-backend/internal/config"
)

// RunMigrations runs pending Goose SQL migrations from the specified directory.
func RunMigrations(cfg config.DatabaseConfig, migrationsDir string) error {
	db, err := sql.Open("pgx", cfg.DSN())
	if err != nil {
		return fmt.Errorf("failed to open database for migrations: %w", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("failed to set goose dialect: %w", err)
	}

	slog.Info("Running Goose database migrations...", slog.String("dir", migrationsDir))
	if err := goose.Up(db, migrationsDir); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	slog.Info("Database migrations completed successfully")
	return nil
}

