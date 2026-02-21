"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Word } from "@/lib/data";
import { fetchAllWords } from "@/lib/api";

export default function SentenceAnalyzerPage() {
  const [sentence, setSentence] = useState("");
  const [dbWords, setDbWords] = useState<Word[]>([]);

  useEffect(() => {
    fetchAllWords().then(setDbWords).catch(() => {});
  }, []);
  const [recommendations, setRecommendations] = useState<
    { original: string; alternatives: string[]; meaning: string }[]
  >([]);
  const [analyzed, setAnalyzed] = useState(false);

  const wordCount = sentence.trim() ? sentence.trim().split(/\s+/).length : 0;

  const synonymMap: Record<string, { alternatives: string[]; meaning: string }> = {
    good: { alternatives: ["excellent", "outstanding", "commendable", "exemplary", "stellar"], meaning: "Of high quality or standard" },
    bad: { alternatives: ["suboptimal", "deficient", "inadequate", "unsatisfactory", "flawed"], meaning: "Of poor quality or standard" },
    fix: { alternatives: ["resolve", "remediate", "rectify", "address", "mitigate"], meaning: "To repair or correct an issue" },
    make: { alternatives: ["implement", "construct", "architect", "fabricate", "orchestrate"], meaning: "To create or build" },
    use: { alternatives: ["leverage", "utilize", "employ", "harness", "adopt"], meaning: "To put into practice or service" },
    big: { alternatives: ["substantial", "significant", "considerable", "extensive", "scalable"], meaning: "Large in size or magnitude" },
    small: { alternatives: ["granular", "incremental", "minimal", "compact", "atomic"], meaning: "Small in size or scope" },
    fast: { alternatives: ["performant", "optimized", "efficient", "responsive", "high-throughput"], meaning: "High speed or quick execution" },
    slow: { alternatives: ["latent", "bottlenecked", "throttled", "constrained", "degraded"], meaning: "Low speed or delayed" },
    hard: { alternatives: ["complex", "challenging", "non-trivial", "intricate", "sophisticated"], meaning: "Difficult to accomplish" },
    easy: { alternatives: ["straightforward", "trivial", "intuitive", "seamless", "turnkey"], meaning: "Simple to accomplish" },
    change: { alternatives: ["refactor", "iterate", "evolve", "transform", "migrate"], meaning: "To modify or alter" },
    check: { alternatives: ["validate", "verify", "audit", "inspect", "assess"], meaning: "To examine or confirm" },
    old: { alternatives: ["legacy", "deprecated", "antiquated", "obsolete", "heritage"], meaning: "No longer current or modern" },
    new: { alternatives: ["innovative", "novel", "cutting-edge", "state-of-the-art", "emerging"], meaning: "Recently created or introduced" },
    problem: { alternatives: ["impediment", "bottleneck", "regression", "anomaly", "blocker"], meaning: "An issue that needs resolution" },
    help: { alternatives: ["facilitate", "empower", "enable", "support", "assist"], meaning: "To provide aid or assistance" },
    try: { alternatives: ["attempt", "evaluate", "experiment", "pilot", "prototype"], meaning: "To make an effort to do something" },
    start: { alternatives: ["initiate", "bootstrap", "provision", "kickoff", "commence"], meaning: "To begin an action" },
    stop: { alternatives: ["terminate", "deprecate", "sunset", "decommission", "halt"], meaning: "To cease an action" },
    send: { alternatives: ["dispatch", "transmit", "propagate", "publish", "emit"], meaning: "To cause to go to a destination" },
    get: { alternatives: ["retrieve", "fetch", "acquire", "obtain", "extract"], meaning: "To receive or obtain" },
    show: { alternatives: ["render", "display", "visualize", "surface", "present"], meaning: "To make visible" },
    remove: { alternatives: ["deprecate", "decommission", "purge", "eliminate", "retire"], meaning: "To take away or dispose of" },
    test: { alternatives: ["validate", "verify", "assert", "benchmark", "stress-test"], meaning: "To evaluate or examine" },
  };

  const analyzeSentence = () => {
    if (wordCount === 0) return;

    const words = sentence.trim().split(/\s+/);
    const results: { original: string; alternatives: string[]; meaning: string }[] = [];

    words.forEach((w) => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, "");
      if (synonymMap[clean]) {
        results.push({
          original: w,
          alternatives: synonymMap[clean].alternatives,
          meaning: synonymMap[clean].meaning,
        });
      }
    });

    const wordsLower = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ""));
    dbWords.forEach((dbWord) => {
      dbWord.alternativeWords.forEach((alt) => {
        if (wordsLower.includes(alt.toLowerCase())) {
          const idx = wordsLower.indexOf(alt.toLowerCase());
          const alreadyAdded = results.some((r) => r.original.toLowerCase().replace(/[^a-z]/g, "") === alt.toLowerCase());
          if (!alreadyAdded) {
            results.push({
              original: words[idx],
              alternatives: [dbWord.word, ...dbWord.alternativeWords.filter((a) => a.toLowerCase() !== alt.toLowerCase())].slice(0, 5),
              meaning: dbWord.meaning,
            });
          }
        }
      });
    });

    setRecommendations(results.slice(0, 20));
    setAnalyzed(true);
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6">
        <Link href="/" className="link-hover">Home</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">Sentence Analyzer</span>
      </nav>

      {/* Hero */}
      <section className="hero-banner p-8 lg:p-10 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">✍️</span>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Sentence Analyzer</h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              Enter a sentence (up to 30 words) and get up to 20 alternative word recommendations.
            </p>
          </div>
        </div>
      </section>

      {/* Input */}
      <div className="card p-6 mb-6">
        <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 block">
          Your Sentence
        </label>
        <textarea
          value={sentence}
          onChange={(e) => {
            setSentence(e.target.value);
            setAnalyzed(false);
          }}
          placeholder="e.g. 'We need to fix the old slow code and make it fast for the new deployment'"
          className="input min-h-[120px] resize-none"
          rows={4}
        />
        <div className="flex items-center justify-between mt-3">
          <span className={`text-xs ${wordCount > 30 ? "text-[var(--error)]" : "text-[var(--text-muted)]"}`}>
            {wordCount}/30 words
          </span>
          <button
            onClick={analyzeSentence}
            disabled={wordCount === 0 || wordCount > 30}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Analyze →
          </button>
        </div>
      </div>

      {/* Results */}
      {analyzed && (
        <div className="animate-slide-in-up">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 rounded-full" style={{ background: "var(--accent-gradient)" }} />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {recommendations.length} Recommendation{recommendations.length !== 1 ? "s" : ""}
            </h2>
          </div>

          {recommendations.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-[var(--text-tertiary)]">
                No common word upgrades found. Try using simpler or more common words.
              </p>
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-mono px-2 py-0.5 rounded border line-through"
                      style={{ background: "#fef2f2", color: "#ef4444", borderColor: "#fecaca" }}>
                      {rec.original}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs text-[var(--text-muted)]">upgrade to:</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {rec.alternatives.map((alt) => (
                      <span
                        key={alt}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium"
                        style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}
                      >
                        {alt}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] italic">{rec.meaning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
