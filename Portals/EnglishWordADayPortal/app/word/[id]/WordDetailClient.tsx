"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Word, getGenreBySlug, getAverageDifficulty } from "@/lib/data";
import { fetchWordsByGenre, rateWord } from "@/lib/api";
import { useWordRotation } from "@/hooks/useWordRotation";

interface Props {
  word: Word;
}

export default function WordDetailClient({ word }: Props) {
  const [genreWords, setGenreWords] = useState<Word[]>([word]);
  const genre = getGenreBySlug(word.genre);

  useEffect(() => {
    fetchWordsByGenre(word.genre).then((res) => setGenreWords(res.words)).catch(() => {});
  }, [word.genre]);

  const { currentWord: displayWord, nextWord } = useWordRotation(word, genreWords);
  const alternatives = displayWord.alternativeWords || [];
  const avgDifficulty = getAverageDifficulty(displayWord);

  useEffect(() => {
    if (displayWord.id !== word.id) {
      window.history.replaceState(null, "", `/word/${displayWord.id}`);
    }
  }, [displayWord.id, word.id]);

  function handleRate(rating: number) {
    rateWord(displayWord.id, rating);
  }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto transition-all duration-300" key={displayWord.id}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6">
        <Link href="/" className="link-hover">Home</Link>
        <span>/</span>
        <Link href={`/genre/${displayWord.genre}`} className="link-hover">
          {genre ? `${genre.icon} ${genre.name}` : displayWord.genre}
        </Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">{displayWord.word}</span>
      </div>

      {/* Word heading */}
      <h1 className="text-4xl lg:text-5xl font-bold gradient-text tracking-tight mb-2 animate-slide-down">
        {displayWord.word}
      </h1>
      <div className="flex items-center gap-4 mb-6 animate-slide-down stagger-1">
        <p className="text-sm text-[var(--text-muted)] font-mono">
          /{displayWord.pronunciation}/ · <span className="text-[var(--accent)]">{displayWord.partOfSpeech}</span>
        </p>
        <DifficultyBadge level={displayWord.difficulty} avgRating={avgDifficulty} />
      </div>

      <p className="text-base text-[var(--text-secondary)] leading-relaxed mb-8 animate-slide-down stagger-2">
        {displayWord.meaning}
      </p>

      {/* IT Context */}
      <div className="card p-5 mb-5 animate-slide-down stagger-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="badge badge-accent">IT Context</span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{displayWord.itContext}</p>
      </div>

      {/* Example */}
      <div className="context-box mb-8 animate-slide-down stagger-4">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Example</p>
        <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
          &ldquo;{displayWord.samplePhrase}&rdquo;
        </p>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="card p-5 mb-5 animate-fade-in">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Alternative Words</p>
          <div className="flex flex-wrap gap-1.5">
            {alternatives.map((alt: string) => (
              <span key={alt} className="badge badge-accent">{alt}</span>
            ))}
          </div>
        </div>
      )}

      {/* Rate Difficulty */}
      <div className="card p-5 mb-5 animate-fade-in">
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Rate Difficulty</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => handleRate(star)} className="p-1 hover:scale-125 transition-transform" title={`Rate ${star}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={star <= displayWord.difficulty ? "var(--accent)" : "none"}
                stroke="var(--accent)" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex items-center justify-between mb-8 px-1">
        <p className="text-[0.65rem] text-[var(--text-muted)] font-mono">Added {displayWord.dateAdded}</p>
        {genre && (
          <Link href={`/genre/${displayWord.genre}`} className="text-[0.65rem] text-[var(--accent)] font-medium hover:underline">
            {genre.icon} {genre.name}
          </Link>
        )}
      </div>

      {/* Next Word */}
      <div className="card p-6 mb-6 text-center animate-fade-in">
        <p className="text-xs text-[var(--text-muted)] mb-3">Keep learning — discover the next word</p>
        <button onClick={nextWord} className="btn-primary py-3 px-8 text-base w-full sm:w-auto">
          Next Word →
        </button>
      </div>

      {/* Back to genre */}
      <div className="text-center">
        <Link href={`/genre/${displayWord.genre}`} className="btn-secondary">
          ← Back to {genre ? genre.name : displayWord.genre}
        </Link>
      </div>
    </div>
  );
}

function DifficultyBadge({ level, avgRating }: { level: number; avgRating: number }) {
  const labels = ["", "Easy", "Moderate", "Intermediate", "Advanced", "Expert"];
  const colors = ["", "#059669", "#0891b2", "#6366f1", "#d97706", "#dc2626"];
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={i <= Math.round(avgRating) ? colors[level] : "none"}
            stroke={colors[level]}
            strokeWidth="2"
            className="difficulty-star"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      <span className="text-[0.65rem] font-medium" style={{ color: colors[level] }}>
        {labels[level]}
      </span>
    </div>
  );
}
