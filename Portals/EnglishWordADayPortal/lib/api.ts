// lib/api.ts — API client that talks to the Go backend, with static JSON fallback

import { type Word, GENRES } from "./data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export interface PaginatedResponse {
  words: Word[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function backendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

let _useBackend: boolean | null = null;

async function shouldUseBackend(): Promise<boolean> {
  if (_useBackend !== null) return _useBackend;
  _useBackend = await backendAvailable();
  return _useBackend;
}

// Fetch words by genre — prefers Go backend, falls back to static JSON
export async function fetchWordsByGenre(genre: string, page = 1, pageSize = 100): Promise<PaginatedResponse> {
  if (await shouldUseBackend()) {
    const res = await fetch(`${API_BASE}/api/words?genre=${genre}&page=${page}&pageSize=${pageSize}`);
    return res.json();
  }
  return fallbackFetchByGenre(genre, page, pageSize);
}

// Fetch a single word by ID
export async function fetchWordById(id: string): Promise<Word | null> {
  if (await shouldUseBackend()) {
    const res = await fetch(`${API_BASE}/api/word?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return res.json();
  }
  const all = await fallbackLoadAll();
  return all.find((w) => w.id === id) || null;
}

// Search words
export async function searchWords(query: string, genre?: string, date?: string, page = 1, pageSize = 50): Promise<PaginatedResponse> {
  if (await shouldUseBackend()) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query) params.set("q", query);
    if (genre) params.set("genre", genre);
    if (date) params.set("date", date);
    const res = await fetch(`${API_BASE}/api/search?${params}`);
    return res.json();
  }
  return fallbackSearch(query, genre, date, page, pageSize);
}

// Rate a word (backend only — no-op on static fallback)
export async function rateWord(id: string, rating: number): Promise<boolean> {
  if (await shouldUseBackend()) {
    const res = await fetch(`${API_BASE}/api/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, rating }),
    });
    return res.ok;
  }
  return false;
}

// Fetch all words across all genres
export async function fetchAllWords(): Promise<Word[]> {
  if (await shouldUseBackend()) {
    const res = await fetch(`${API_BASE}/api/words?page=1&pageSize=9999`);
    const data: PaginatedResponse = await res.json();
    return data.words;
  }
  return fallbackLoadAll();
}

// ========== Static JSON Fallback (GitHub Pages) ==========

let _allWordsCache: Word[] | null = null;

async function fallbackLoadAll(): Promise<Word[]> {
  if (_allWordsCache) return _allWordsCache;
  const all: Word[] = [];
  await Promise.all(
    GENRES.map(async (g) => {
      try {
        const res = await fetch(`${BASE_PATH}/data/words/${g.slug}/words_001.json`);
        const words: Word[] = await res.json();
        all.push(...words);
      } catch { /* skip missing files */ }
    })
  );
  _allWordsCache = all;
  return all;
}

async function fallbackFetchByGenre(genre: string, page: number, pageSize: number): Promise<PaginatedResponse> {
  try {
    const res = await fetch(`${BASE_PATH}/data/words/${genre}/words_001.json`);
    const words: Word[] = await res.json();
    const start = (page - 1) * pageSize;
    const paged = words.slice(start, start + pageSize);
    return { words: paged, total: words.length, page, pageSize, totalPages: Math.ceil(words.length / pageSize) };
  } catch {
    return { words: [], total: 0, page, pageSize, totalPages: 0 };
  }
}

async function fallbackSearch(query: string, genre: string | undefined, date: string | undefined, page: number, pageSize: number): Promise<PaginatedResponse> {
  const all = await fallbackLoadAll();
  const q = (query || "").toLowerCase();
  const filtered = all.filter((w) => {
    if (genre && w.genre !== genre) return false;
    if (date && w.dateAdded !== date) return false;
    if (q) {
      return (
        w.word.toLowerCase().includes(q) ||
        w.meaning.toLowerCase().includes(q) ||
        w.samplePhrase.toLowerCase().includes(q) ||
        w.alternativeWords.some((alt) => alt.toLowerCase().includes(q)) ||
        w.itContext.toLowerCase().includes(q)
      );
    }
    return true;
  });
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  return { words: paged, total: filtered.length, page, pageSize, totalPages: Math.ceil(filtered.length / pageSize) };
}
