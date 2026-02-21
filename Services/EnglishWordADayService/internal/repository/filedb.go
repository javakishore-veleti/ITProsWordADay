package repository

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/cache"
	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/models"
)

type FileDB struct {
	rootPath string
	Cache    *cache.MemoryCache
}

func NewFileDB(rootPath string) *FileDB {
	return &FileDB{
		rootPath: rootPath,
		Cache:    cache.New(),
	}
}

func (db *FileDB) LoadAll() error {
	var allWords []models.Word

	err := filepath.WalkDir(db.rootPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() || !strings.HasSuffix(d.Name(), ".json") {
			return nil
		}

		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("Warning: could not read %s: %v", path, err)
			return nil
		}

		var words []models.Word
		if err := json.Unmarshal(data, &words); err == nil {
			allWords = append(allWords, words...)
			return nil
		}

		var word models.Word
		if err := json.Unmarshal(data, &word); err == nil {
			allWords = append(allWords, word)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("failed to walk data directory: %w", err)
	}

	db.Cache.Set(allWords)
	log.Printf("Loaded %d words from %s", len(allWords), db.rootPath)
	return nil
}

func (db *FileDB) EnsureLoaded() {
	if db.Cache.IsStale() {
		if err := db.LoadAll(); err != nil {
			log.Printf("Error reloading database: %v", err)
		}
	}
}

func (db *FileDB) GetByID(id string) *models.Word {
	db.EnsureLoaded()
	return db.Cache.GetByID(id)
}

func (db *FileDB) Search(page, pageSize int, genre, date, query string) models.PaginatedResponse {
	db.EnsureLoaded()
	return db.Cache.GetPaginated(page, pageSize, genre, date, query)
}
