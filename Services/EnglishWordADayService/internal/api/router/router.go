package router

import (
	"net/http"

	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/api/handler"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/config"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/services/rating"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/services/search"
)

func New(cfg config.Config, searchSvc *search.Service, ratingSvc *rating.Service) *http.ServeMux {
	mux := http.NewServeMux()

	wordsH := handler.NewWordsHandler(searchSvc, cfg)
	searchH := handler.NewSearchHandler(searchSvc, cfg)
	ratingH := handler.NewRatingHandler(ratingSvc)
	healthH := handler.NewHealthHandler(searchSvc, cfg)

	mux.HandleFunc("/api/words", wordsH.GetWords)
	mux.HandleFunc("/api/word", wordsH.GetWord)
	mux.HandleFunc("/api/search", searchH.Search)
	mux.HandleFunc("/api/rate", ratingH.RateWord)
	mux.HandleFunc("/api/health", healthH.Health)

	return mux
}
