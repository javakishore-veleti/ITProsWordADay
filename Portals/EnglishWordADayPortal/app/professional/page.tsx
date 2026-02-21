"use client";

import Link from "next/link";
import { PROFESSIONAL_EXPRESSIONS } from "@/lib/data";
import { useState } from "react";

const FEELING_EMOJIS: Record<string, string> = {
  "Frustrated": "😤",
  "Annoyed": "😒",
  "Overwhelmed": "😰",
  "Irritated by meetings": "🙄",
  "Disappointed with code review": "😞",
  "Fuming about production incident": "🔥",
};

export default function ProfessionalSpeakPage() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6">
        <Link href="/" className="link-hover">Home</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)]">Professional Speak</span>
      </nav>

      {/* Hero */}
      <section className="hero-banner p-8 lg:p-10 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">💼</span>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Professional Speak</h1>
            <p className="text-sm text-[var(--text-tertiary)] max-w-2xl">
              We all feel frustrated, annoyed, or overwhelmed at work. Here&apos;s how to express those feelings
              professionally in JIRA, Slack, git commits, and code reviews.
            </p>
          </div>
        </div>
      </section>

      {/* Expression Cards */}
      <div className="space-y-3 stagger-children">
        {PROFESSIONAL_EXPRESSIONS.map((expr, idx) => {
          const isExpanded = expanded === idx;
          return (
            <div key={idx} className="card overflow-hidden">
              <button
                className="w-full p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                onClick={() => setExpanded(isExpanded ? null : idx)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{FEELING_EMOJIS[expr.feeling] || "💬"}</span>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{expr.feeling}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                      {expr.professional}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-[var(--text-muted)] transition-transform shrink-0 ml-3 ${isExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 animate-slide-in-up">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div className="p-4 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                      <span className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#ef4444" }}>
                        Don&apos;t say this
                      </span>
                      <p className="text-sm text-[var(--text-secondary)] italic">
                        &ldquo;{expr.unprofessional}&rdquo;
                      </p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                      <span className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "#059669" }}>
                        Say this instead
                      </span>
                      <p className="text-sm text-[var(--text-secondary)]">
                        &ldquo;{expr.professional}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <ContextExample icon="📋" label="JIRA Comment" text={expr.jiraComment} />
                    <ContextExample icon="💬" label="Slack Message" text={expr.slackMessage} />
                    <ContextExample icon="🔀" label="Git Commit" text={expr.gitCommit} mono />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContextExample({ icon, label, text, mono }: { icon: string; label: string; text: string; mono?: boolean }) {
  return (
    <div className="context-box">
      <div className="context-box-label">{icon} {label}</div>
      <p className={`text-sm text-[var(--text-secondary)] ${mono ? "font-mono text-xs" : ""}`}>{text}</p>
    </div>
  );
}
