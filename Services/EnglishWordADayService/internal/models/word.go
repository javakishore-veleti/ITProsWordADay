package models

type Word struct {
	ID               string   `json:"id"`
	Word             string   `json:"word"`
	Meaning          string   `json:"meaning"`
	Genre            string   `json:"genre"`
	Difficulty       int      `json:"difficulty"`
	DateAdded        string   `json:"dateAdded"`
	SamplePhrase     string   `json:"samplePhrase"`
	ITContext        string   `json:"itContext"`
	AlternativeWords []string `json:"alternativeWords"`
	Pronunciation    string   `json:"pronunciation"`
	PartOfSpeech     string   `json:"partOfSpeech"`
	Ratings          []int    `json:"ratings"`
}

type PaginatedResponse struct {
	Words      []Word `json:"words"`
	Total      int    `json:"total"`
	Page       int    `json:"page"`
	PageSize   int    `json:"pageSize"`
	TotalPages int    `json:"totalPages"`
}
