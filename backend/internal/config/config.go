package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Redis    RedisConfig
	CORS     CORSConfig
	JWT      JWTConfig
}

type AppConfig struct {
	Env      string
	Port     int
	URL      string
	LogLevel string
}

type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	Name            string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		d.User, d.Password, d.Host, d.Port, d.Name, d.SSLMode)
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	Enabled  bool
}

func (r RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

type JWTConfig struct {
	AccessSecret  string
	RefreshSecret string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
	CookieName    string
	CookieSecure  bool
}

// Load loads configuration from environment variables and an optional .env file.
func Load() (*Config, error) {
	// Try loading from .env in backend directory or root
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	appEnv := getEnv("APP_ENV", "development")

	cfg := &Config{
		App: AppConfig{
			Env:      appEnv,
			Port:     getEnvAsInt("APP_PORT", 8080),
			URL:      getEnv("APP_URL", "http://localhost:8080"),
			LogLevel: getEnv("LOG_LEVEL", "info"),
		},
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnvAsInt("DB_PORT", 5432),
			User:            getEnv("DB_USER", "quorix"),
			Password:        getEnv("DB_PASSWORD", "quorix_dev_secret"),
			Name:            getEnv("DB_NAME", "quorix_db"),
			SSLMode:         getEnv("DB_SSLMODE", "disable"),
			MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: getEnvAsDuration("DB_CONN_MAX_LIFETIME", 30*time.Minute),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnvAsInt("REDIS_PORT", 6379),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
			Enabled:  getEnvAsBool("REDIS_ENABLED", true),
		},
		CORS: CORSConfig{
			AllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{
				"http://localhost:3000",
				"http://127.0.0.1:3000",
			}),
			AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
			AllowedHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Request-ID"},
		},
		JWT: JWTConfig{
			AccessSecret:  getEnv("JWT_ACCESS_SECRET", "development_access_secret_min_32_chars_long_quorix"),
			RefreshSecret: getEnv("JWT_REFRESH_SECRET", "development_refresh_secret_min_32_chars_long_quorix"),
			AccessTTL:     getEnvAsDuration("JWT_ACCESS_TTL", 15*time.Minute),
			RefreshTTL:    getEnvAsDuration("JWT_REFRESH_TTL", 7*24*time.Hour),
			CookieName:    getEnv("COOKIE_NAME", "quorix_rt"),
			CookieSecure:  getEnvAsBool("COOKIE_SECURE", appEnv == "production"),
		},
	}

	return cfg, nil
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func getEnvAsBool(key string, defaultVal bool) bool {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.ParseBool(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func getEnvAsDuration(key string, defaultVal time.Duration) time.Duration {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	dur, err := time.ParseDuration(valStr)
	if err != nil {
		return defaultVal
	}
	return dur
}

func getEnvAsSlice(key string, defaultVal []string) []string {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	parts := strings.Split(valStr, ",")
	var result []string
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
