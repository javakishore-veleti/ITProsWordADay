"use client";

import Link from "next/link";
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
          <div className="w-64 h-64 lg:w-80 lg:h-80 shrink-0 rounded-2xl overflow-hidden animate-float flex items-center justify-center"
            style={{ animationDelay: "0.5s", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-card)", background: "var(--accent-gradient)" }}>
            <svg viewBox="0 0 200 200" className="w-3/4 h-3/4 opacity-90" fill="none">
              <rect x="30" y="40" width="140" height="120" rx="12" fill="white" fillOpacity="0.15"/>
              <rect x="45" y="60" width="80" height="8" rx="4" fill="white" fillOpacity="0.6"/>
              <rect x="45" y="78" width="110" height="5" rx="2.5" fill="white" fillOpacity="0.3"/>
              <rect x="45" y="90" width="95" height="5" rx="2.5" fill="white" fillOpacity="0.3"/>
              <rect x="45" y="110" width="50" height="20" rx="6" fill="white" fillOpacity="0.5"/>
              <text x="100" y="30" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" opacity="0.8">Aa</text>
            </svg>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mb-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <FeatureCard href="/search" title="Search Words" desc="Find by name, meaning, date, or genre"
            icon={<svg viewBox="0 0 48 48" className="w-16 h-16" fill="none" stroke="var(--accent)" strokeWidth="2.5"><circle cx="20" cy="20" r="14" /><path d="M30 30l10 10" strokeLinecap="round"/><circle cx="20" cy="20" r="7" strokeDasharray="3 3" opacity="0.4"/></svg>}
            delay="stagger-1" />
          <FeatureCard href="/sentence" title="Sentence Analyzer" desc="Upgrade vocabulary with AI-powered analysis"
            icon={<svg viewBox="0 0 48 48" className="w-16 h-16" fill="none" stroke="var(--accent)" strokeWidth="2.5"><rect x="4" y="8" width="40" height="32" rx="4"/><path d="M12 18h24M12 26h18M12 34h12" strokeLinecap="round"/><path d="M36 28l4 4-4 4" opacity="0.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            delay="stagger-2" />
          <FeatureCard href="/professional" title="Professional Speak" desc="Communicate like a pro in JIRA, Slack, Git"
            icon={<svg viewBox="0 0 48 48" className="w-16 h-16" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M8 36V12a4 4 0 014-4h24a4 4 0 014 4v16a4 4 0 01-4 4H16l-8 8z"/><path d="M16 18h16M16 24h10" strokeLinecap="round"/></svg>}
            delay="stagger-3" />
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

function FeatureCard({ href, title, desc, icon, delay }: {
  href: string; title: string; desc: string; icon: React.ReactNode; delay: string;
}) {
  return (
    <Link href={href}>
      <div className={`card card-interactive overflow-hidden group h-full animate-fade-in ${delay}`}>
        <div className="h-40 flex items-center justify-center p-4 bg-[var(--bg-surface)]">
          <div className="group-hover:scale-110 transition-transform duration-500">
            {icon}
          </div>
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
