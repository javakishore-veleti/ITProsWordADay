package search

import (
	"itpros-wordaday-service/internal/models"
	"itpros-wordaday-service/internal/repository"
)

type Service struct {
	db *repository.FileDB
}

func NewService(db *repository.FileDB) *Service {
	return &Service{db: db}
}

func (s *Service) GetWords(page, pageSize int, genre, date, query string) models.PaginatedResponse {
	return s.db.Search(page, pageSize, genre, date, query)
}

func (s *Service) GetWordByID(id string) *models.Word {
	return s.db.GetByID(id)
}

func (s *Service) WordCount() int {
	return s.db.Cache.Count()
}
