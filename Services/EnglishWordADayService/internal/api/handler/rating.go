package handler

import (
	"encoding/json"
	"net/http"

	"itpros-wordaday-service/internal/services/rating"
)

type RatingHandler struct {
	ratingSvc *rating.Service
}

func NewRatingHandler(ratingSvc *rating.Service) *RatingHandler {
	return &RatingHandler{ratingSvc: ratingSvc}
}

func (h *RatingHandler) RateWord(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "POST required"})
		return
	}

	var req struct {
		ID     string `json:"id"`
		Rating int    `json:"rating"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := h.ratingSvc.RateWord(req.ID, req.Rating); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rated"})
}
