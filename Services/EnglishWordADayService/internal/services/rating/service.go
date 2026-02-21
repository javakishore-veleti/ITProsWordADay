package rating

import (
	"fmt"

	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/repository"
)

type Service struct {
	db *repository.FileDB
}

func NewService(db *repository.FileDB) *Service {
	return &Service{db: db}
}

func (s *Service) RateWord(id string, rating int) error {
	if rating < 1 || rating > 5 {
		return fmt.Errorf("rating must be between 1 and 5")
	}
	w := s.db.GetByID(id)
	if w == nil {
		return fmt.Errorf("word not found: %s", id)
	}
	// In production with millions of words, ratings go to a separate persistent store.
	// For now, validated in-memory only.
	return nil
}
