package cache

import (
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/ITProsWordADay/Services/EnglishWordADayService/internal/models"
)

type MemoryCache struct {
	mu       sync.RWMutex
	words    map[string]models.Word
	byGenre  map[string][]string
	byDate   map[string][]string
	allIDs   []string
	ttl      time.Duration
	lastLoad time.Time
}

func New() *MemoryCache {
	return &MemoryCache{
		words:   make(map[string]models.Word),
		byGenre: make(map[string][]string),
		byDate:  make(map[string][]string),
		ttl:     5 * time.Minute,
	}
}

func (c *MemoryCache) Set(words []models.Word) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.words = make(map[string]models.Word, len(words))
	c.byGenre = make(map[string][]string)
	c.byDate = make(map[string][]string)
	c.allIDs = make([]string, 0, len(words))

	for _, w := range words {
		c.words[w.ID] = w
		c.allIDs = append(c.allIDs, w.ID)
		c.byGenre[w.Genre] = append(c.byGenre[w.Genre], w.ID)
		c.byDate[w.DateAdded] = append(c.byDate[w.DateAdded], w.ID)
	}

	sort.Strings(c.allIDs)
	c.lastLoad = time.Now()
}

func (c *MemoryCache) IsStale() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return time.Since(c.lastLoad) > c.ttl
}

func (c *MemoryCache) GetByID(id string) *models.Word {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if w, ok := c.words[id]; ok {
		return &w
	}
	return nil
}

func (c *MemoryCache) GetPaginated(page, pageSize int, genre, date, query string) models.PaginatedResponse {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var candidateIDs []string
	if genre != "" {
		candidateIDs = c.byGenre[genre]
	} else if date != "" {
		candidateIDs = c.byDate[date]
	} else {
		candidateIDs = c.allIDs
	}

	var filtered []models.Word
	q := strings.ToLower(query)
	for _, id := range candidateIDs {
		w := c.words[id]
		if q != "" {
			match := strings.Contains(strings.ToLower(w.Word), q) ||
				strings.Contains(strings.ToLower(w.Meaning), q) ||
				strings.Contains(strings.ToLower(w.SamplePhrase), q) ||
				strings.Contains(strings.ToLower(w.ITContext), q)
			if !match {
				for _, syn := range w.AlternativeWords {
					if strings.Contains(strings.ToLower(syn), q) {
						match = true
						break
					}
				}
			}
			if !match {
				continue
			}
		}
		filtered = append(filtered, w)
	}

	total := len(filtered)
	totalPages := (total + pageSize - 1) / pageSize
	if page < 1 {
		page = 1
	}
	if page > totalPages && totalPages > 0 {
		page = totalPages
	}

	start := (page - 1) * pageSize
	end := start + pageSize
	if end > total {
		end = total
	}
	if start > total {
		start = total
	}

	return models.PaginatedResponse{
		Words:      filtered[start:end],
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}
}

func (c *MemoryCache) Count() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.words)
}
