// lib/data.server.ts — Server-only word loader (reads JSON from disk at build time)
// Only import this in server components (page.tsx files), never in "use client" files.

import fs from "fs";
import path from "path";
import { type Word, GENRES } from "./data";

const WORDS_DIR = path.join(process.cwd(), "public", "data", "words");

function loadGenreFromDisk(genreSlug: string): Word[] {
  const dir = path.join(WORDS_DIR, genreSlug);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const words: Word[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) words.push(...parsed);
    } catch {
      // skip malformed files
    }
  }
  return words;
}

let _cache: Word[] | null = null;

export function loadAllWords(): Word[] {
  if (_cache) return _cache;
  const all: Word[] = [];
  for (const g of GENRES) {
    all.push(...loadGenreFromDisk(g.slug));
  }
  _cache = all;
  return all;
}

export function getWordsByGenre(genreSlug: string): Word[] {
  return loadGenreFromDisk(genreSlug);
}

export function getWordById(id: string): Word | undefined {
  return loadAllWords().find((w) => w.id === id);
}

export function getWordOfTheDay(): Word {
  const all = loadAllWords();
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return all[dayOfYear % all.length];
}

export function getTopWordsByGenre(genreSlug: string, limit: number = 10): Word[] {
  return getWordsByGenre(genreSlug).slice(0, limit);
}
