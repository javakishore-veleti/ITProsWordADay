"use client";

import Link from "next/link";
import Image from "next/image";
import { GENRES } from "@/lib/data";
import type { Word } from "@/lib/data";
import { fetchAllWords, fetchWordsByGenre } from "@/lib/api";
import { useWordRotation } from "@/hooks/useWordRotation";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [genreWords, setGenreWords] = useState<Record<string, Word[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const byGenre: Record<string, Word[]> = {};
      const all: Word[] = [];
      await Promise.all(
        GENRES.map(async (g) => {
          const res = await fetchWordsByGenre(g.slug);
          byGenre[g.slug] = res.words;
          all.push(...res.words);
        })
      );
      setAllWords(all);
      setGenreWords(byGenre);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  return <DashboardContent allWords={allWords} genreWords={genreWords} />;
}

function getTodaysWord(words: Word[]): Word {
  const today = new Date().toISOString().split("T")[0];
  const todayWord = words.find((w) => w.dateAdded === today);
  if (todayWord) return todayWord;
  return words[Math.floor((new Date().getTime() / 86400000) % words.length)] || words[0];
}

function DashboardContent({ allWords, genreWords }: { allWords: Word[]; genreWords: Record<string, Word[]> }) {
  const initialWord = getTodaysWord(allWords);
  const { currentWord, nextWord } = useWordRotation(initialWord, allWords);

  return (
    <div>
      {/* Hero */}
      <section className="hero-banner p-8 lg:p-10 mb-12 animate-fade-in relative transition-all duration-300">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-10">
          <div className="flex-1 min-w-0" key={currentWord.id}>
            <div className="flex items-center gap-3 mb-6">
              <span className="badge badge-accent">Today&apos;s Word</span>
              <span className="text-xs text-[var(--text-muted)]">{currentWord.dateAdded}</span>
            </div>
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold gradient-text tracking-tight mb-3 animate-slide-down">
              {currentWord.word}
            </h1>
            <p className="text-sm text-[var(--text-muted)] font-mono mb-5 animate-slide-down stagger-1">
              /{currentWord.pronunciation}/ · <span className="text-[var(--accent)]">{currentWord.partOfSpeech}</span>
            </p>
            <p className="text-base lg:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl mb-6 animate-slide-down stagger-2">
              {currentWord.meaning}
            </p>
            <div className="context-box max-w-xl mb-8 animate-slide-down stagger-3">
              <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
                &ldquo;{currentWord.samplePhrase}&rdquo;
              </p>
            </div>
            <div className="flex items-center gap-3 animate-slide-down stagger-4">
              <Link href={`/word/${currentWord.id}`} className="btn-primary">
                Explore word
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
              <button onClick={nextWord} className="btn-secondary">Next word →</button>
            </div>
          </div>
          <div className="w-64 h-64 lg:w-80 lg:h-80 shrink-0 rounded-2xl overflow-hidden animate-float"
            style={{ animationDelay: "0.5s", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)" }}>
            <Image src="/images/word-hero.png" alt="Learn a new word every day" width={320} height={320}
              className="w-full h-full object-cover" priority />
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mb-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FeatureCard href="/search" title="Search Words" desc="Find by name, meaning, date, or genre"
            imageSrc="/images/search-illustration.png" delay="stagger-1" />
          <FeatureCard href="/sentence" title="Sentence Analyzer" desc="Upgrade vocabulary with AI-powered analysis"
            imageSrc="/images/sentence-analyzer.png" delay="stagger-2" />
          <FeatureCard href="/professional" title="Professional Speak" desc="Communicate like a pro in JIRA, Slack, Git"
            imageSrc="/images/professional-speak.png" delay="stagger-3" />
        </div>
      </section>

      {/* Genre Grid */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Browse by Genre</h2>
          <span className="text-xs text-[var(--text-muted)]">{GENRES.length} categories · {allWords.length} words</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {GENRES.map((g) => {
            const words = (genreWords[g.slug] || []).slice(0, 3);
            return (
              <Link key={g.slug} href={`/genre/${g.slug}`}>
                <div className="card card-interactive p-0 overflow-hidden animate-fade-in h-full">
                  <div className="h-20 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${g.color}15, ${g.color}30)`, borderBottom: `2px solid ${g.color}25` }}>
                    <span className="text-3xl">{g.icon}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{g.name}</p>
                    <p className="text-[0.65rem] text-[var(--text-muted)] mb-2">{g.description?.slice(0, 50)}</p>
                    {words.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {words.map((w) => (
                          <span key={w.id} className="text-[0.6rem] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: `${g.color}12`, color: g.color }}>{w.word}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ href, title, desc, imageSrc, delay }: {
  href: string; title: string; desc: string; imageSrc: string; delay: string;
}) {
  return (
    <Link href={href}>
      <div className={`card card-interactive overflow-hidden group h-full animate-fade-in ${delay}`}>
        <div className="h-40 flex items-center justify-center p-4 bg-[var(--bg-surface)]">
          <Image src={imageSrc} alt={title} width={140} height={140}
            className="w-28 h-28 object-contain group-hover:scale-110 transition-transform duration-500" />
        </div>
        <div className="p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-1.5">{title}</h3>
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="hero-banner p-8 lg:p-10 mb-12">
        <div className="h-8 w-48 bg-[var(--bg-surface)] rounded mb-4" />
        <div className="h-16 w-80 bg-[var(--bg-surface)] rounded mb-4" />
        <div className="h-4 w-64 bg-[var(--bg-surface)] rounded" />
      </div>
    </div>
  );
}
