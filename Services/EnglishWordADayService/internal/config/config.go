package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port           string
	DeploymentMode string // "github-pages" or "aws"
	DataRootPath   string
	EnableRedis    bool
	RedisAddr      string
	CacheEnabled   bool
	PageSize       int
}

func Load() Config {
	port := envOrDefault("PORT", "8080")
	mode := envOrDefault("DEPLOYMENT_MODE", "github-pages")
	dataRoot := envOrDefault("DATA_ROOT_PATH", "./data")
	redisAddr := envOrDefault("REDIS_ADDR", "localhost:6379")
	enableRedis := os.Getenv("ENABLE_REDIS") == "true"

	pageSize := 20
	if ps := os.Getenv("PAGE_SIZE"); ps != "" {
		if v, err := strconv.Atoi(ps); err == nil && v > 0 {
			pageSize = v
		}
	}

	return Config{
		Port:           port,
		DeploymentMode: mode,
		DataRootPath:   dataRoot,
		EnableRedis:    enableRedis,
		RedisAddr:      redisAddr,
		CacheEnabled:   true,
		PageSize:       pageSize,
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
