package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	db "github.com/quorix/quorix-backend/internal/database/sqlc"
)

// Transactor provides atomic database transaction execution.
type Transactor interface {
	WithTx(ctx context.Context, fn func(queries *db.Queries) error) error
}

// WithTx executes the provided callback within a PostgreSQL transaction.
// Automatically rolls back if an error occurs or a panic is encountered, and commits on success.
func (d *DB) WithTx(ctx context.Context, fn func(queries *db.Queries) error) error {
	if d == nil || d.Pool == nil {
		return fmt.Errorf("database pool is not initialized")
	}

	tx, err := d.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	q := db.New(tx)

	defer func() {
		if r := recover(); r != nil {
			_ = tx.Rollback(ctx)
			panic(r)
		}
	}()

	if err := fn(q); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return fmt.Errorf("error in transaction: %w (rollback error: %v)", err, rbErr)
		}
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
