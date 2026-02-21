package handler

import (
	"net/http"
	"strconv"

	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/config"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/services/search"
)

type SearchHandler struct {
	searchSvc *search.Service
	cfg       config.Config
}

func NewSearchHandler(searchSvc *search.Service, cfg config.Config) *SearchHandler {
	return &SearchHandler{searchSvc: searchSvc, cfg: cfg}
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if pageSize < 1 {
		pageSize = h.cfg.PageSize
	}

	query := r.URL.Query().Get("q")
	genre := r.URL.Query().Get("genre")
	date := r.URL.Query().Get("date")

	result := h.searchSvc.GetWords(page, pageSize, genre, date, query)
	writeJSON(w, http.StatusOK, result)
}
