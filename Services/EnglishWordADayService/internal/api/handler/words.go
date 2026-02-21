package handler

import (
	"net/http"
	"strconv"

	"itpros-wordaday-service/internal/config"
	"itpros-wordaday-service/internal/services/search"
)

type WordsHandler struct {
	searchSvc *search.Service
	cfg       config.Config
}

func NewWordsHandler(searchSvc *search.Service, cfg config.Config) *WordsHandler {
	return &WordsHandler{searchSvc: searchSvc, cfg: cfg}
}

func (h *WordsHandler) GetWords(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if pageSize < 1 {
		pageSize = h.cfg.PageSize
	}
	if pageSize > 100 {
		pageSize = 100
	}

	genre := r.URL.Query().Get("genre")
	date := r.URL.Query().Get("date")
	query := r.URL.Query().Get("q")

	result := h.searchSvc.GetWords(page, pageSize, genre, date, query)
	writeJSON(w, http.StatusOK, result)
}

func (h *WordsHandler) GetWord(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id is required"})
		return
	}
	word := h.searchSvc.GetWordByID(id)
	if word == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "word not found"})
		return
	}
	writeJSON(w, http.StatusOK, word)
}
