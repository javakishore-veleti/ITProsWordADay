package main

import (
	"log"
	"net/http"

	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/api/router"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/config"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/middleware"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/repository"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/services/rating"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/services/search"
)

func main() {
	cfg := config.Load()

	db := repository.NewFileDB(cfg.DataRootPath)
	if err := db.LoadAll(); err != nil {
		log.Printf("Warning: initial data load issue: %v", err)
	}

	if cfg.DeploymentMode == "aws" && cfg.EnableRedis {
		log.Printf("Redis caching enabled at %s", cfg.RedisAddr)
	}

	searchSvc := search.NewService(db)
	ratingSvc := rating.NewService(db)

	mux := router.New(cfg, searchSvc, ratingSvc)
	handler := middleware.CORS(middleware.Logging(mux))

	log.Printf("IT Pros WordADay API starting on port %s (mode: %s)", cfg.Port, cfg.DeploymentMode)
	log.Printf("No user data is stored. Privacy-first by design.")
	log.Printf("Data root: %s | Page size: %d", cfg.DataRootPath, cfg.PageSize)

	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
