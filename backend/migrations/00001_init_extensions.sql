-- +goose Up
-- Initialize PostgreSQL extensions required across domain modules
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- +goose Down
-- Extensions are preserved or dropped explicitly if required

