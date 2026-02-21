"use client";

import Link from "next/link";
import { type Genre, type Word, getGenreBySlug } from "@/lib/data";
import { useWordRotation } from "@/hooks/useWordRotation";
import GenreIllustration from "@/components/GenreIllustration";

interface Props {
  genre: Genre;
  words: Word[];
}

export default function GenreClient({ genre, words }: Props) {
  const { currentWord: featured, nextWord } = useWordRotation(words[0], words);

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6">
        <Link href="/" className="link-hover">Home</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">{genre.icon} {genre.name}</span>
      </div>

      {/* Hero Banner */}
      <section className="hero-banner p-8 lg:p-10 mb-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{genre.icon}</span>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">{genre.name}</h1>
                <p className="text-sm text-[var(--text-tertiary)]">{genre.description} · {words.length} words</p>
              </div>
            </div>

            {featured && (
              <div className="mt-6 transition-all duration-300 relative" key={featured.id}>
                <span className="badge badge-accent mb-3">Featured Word</span>
                <h2 className="text-3xl lg:text-4xl font-bold gradient-text tracking-tight mb-2 animate-slide-down">
                  {featured.word}
                </h2>
                <p className="text-sm text-[var(--text-muted)] font-mono mb-3 animate-slide-down stagger-1">
                  /{featured.pronunciation}/ · <span className="text-[var(--accent)]">{featured.partOfSpeech}</span>
                </p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg mb-4 animate-slide-down stagger-2">
                  {featured.meaning}
                </p>

                <div className="context-box max-w-lg mb-5 animate-slide-down stagger-3">
                  <p className="text-sm text-[var(--text-secondary)] italic">&ldquo;{featured.samplePhrase}&rdquo;</p>
                </div>

                <div className="flex items-center gap-3 animate-slide-down stagger-4">
                  <Link href={`/word/${featured.id}`} className="btn-primary">
                    Explore word
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </Link>
                  {words.length > 1 && (
                    <button onClick={nextWord} className="btn-secondary">
                      Next word →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Unique genre illustration */}
          <div className="shrink-0 animate-float" style={{ animationDelay: "0.5s" }}>
            <GenreIllustration slug={genre.slug} icon={genre.icon} name={genre.name} size="lg" />
          </div>
        </div>
      </section>

      {/* All Words List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">All Words</h2>
          <span className="text-xs text-[var(--text-muted)]">{words.length} total</span>
        </div>
        <div className="card overflow-hidden">
          {words.map((w, i) => (
            <div key={w.id} className={`${i > 0 ? "border-t border-[var(--border-subtle)]" : ""}`}>
              <Link href={`/word/${w.id}`}>
                <div className="flex items-center justify-between px-5 py-4 transition-all hover:bg-[var(--bg-hover)] group cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {w.word}
                      </h3>
                      <DifficultyDots level={w.difficulty} />
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] truncate max-w-md">{w.meaning}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-[0.65rem] text-[var(--text-muted)] font-mono">{w.dateAdded}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
                      className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 items-center ml-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: i <= level ? "var(--accent)" : "var(--border-default)",
          }}
        />
      ))}
    </div>
  );
}
