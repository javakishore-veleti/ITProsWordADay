package handler

import (
	"net/http"

	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/config"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/services/search"
)

type HealthHandler struct {
	searchSvc *search.Service
	cfg       config.Config
}

func NewHealthHandler(searchSvc *search.Service, cfg config.Config) *HealthHandler {
	return &HealthHandler{searchSvc: searchSvc, cfg: cfg}
}

func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":         "healthy",
		"deploymentMode": h.cfg.DeploymentMode,
		"wordsLoaded":    h.searchSvc.WordCount(),
		"cacheEnabled":   h.cfg.CacheEnabled,
		"redisEnabled":   h.cfg.EnableRedis,
	})
}
