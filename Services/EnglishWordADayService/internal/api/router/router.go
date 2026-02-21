package router

import (
	"net/http"

	"itpros-wordaday-service/internal/api/handler"
	"itpros-wordaday-service/internal/config"
	"itpros-wordaday-service/internal/services/rating"
	"itpros-wordaday-service/internal/services/search"
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
