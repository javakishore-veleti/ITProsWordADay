"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GENRES } from "@/lib/data";
import type { Word } from "@/lib/data";
import { searchWords as apiSearch } from "@/lib/api";

export default function SearchClient() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [genre, setGenre] = useState("");
  const [date, setDate] = useState("");
  const [results, setResults] = useState<Word[]>([]);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await apiSearch(query, genre || undefined, date || undefined);
      setResults(res.words);
      setTotal(res.total);
    } catch {
      setResults([]);
      setTotal(0);
    }
    setLoading(false);
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6">
        <Link href="/" className="link-hover">Home</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">Search</span>
      </div>

      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Search Words</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-8">
        Find words by name, meaning, genre, or date via the Go API.
      </p>

      <form onSubmit={handleSearch} className="card p-6 mb-8">
        <div className="mb-4">
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Word or meaning</label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input className="input pl-9" type="text" placeholder="e.g. ephemeral, cloud, resilient..."
              value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Genre</label>
            <select className="input appearance-none" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">All genres</option>
              {GENRES.map((g) => (
                <option key={g.slug} value={g.slug}>{g.icon} {g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Date added</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {hasSearched && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            {total} result{total !== 1 ? "s" : ""} found
          </p>
          {results.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-[var(--text-tertiary)]">No words match your search.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((w) => (
                <Link key={w.id} href={`/word/${w.id}`}>
                  <div className="flex items-center justify-between px-4 py-3 rounded-lg transition-all hover:bg-[var(--bg-elevated)] group cursor-pointer">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-hover)] transition-colors">
                        {w.word}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-3">{w.meaning.slice(0, 60)}…</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="badge badge-accent">{w.genre}</span>
                      <span className="text-[0.65rem] text-[var(--text-muted)] font-mono">{w.dateAdded}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
