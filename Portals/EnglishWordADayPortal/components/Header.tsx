"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { GENRES } from "@/lib/data";

const MAX_VISIBLE = 10;

export default function Header() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [showOthers, setShowOthers] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const visible = GENRES.slice(0, MAX_VISIBLE);
  const others = GENRES.slice(MAX_VISIBLE);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowOthers(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
      setShowMobileSearch(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Primary bar */}
      <div className="h-14 flex items-center justify-between px-5 lg:px-8 bg-white/90 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-gradient)" }}>
            <span className="text-white font-bold text-xs">W</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
            IT Pros <span className="text-[var(--accent)]">Word</span>ADay
          </span>
        </Link>

        {/* Desktop Search */}
        <div className="flex-1 max-w-lg mx-6 hidden sm:block">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="input pl-9 py-2 text-[0.8rem] bg-[var(--bg-surface)]"
              type="text"
              placeholder="Search words, meanings, genres…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            />
          </div>
        </div>

        {/* Right nav */}
        <nav className="flex items-center gap-1 shrink-0">
          {/* Mobile search toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="sm:hidden p-2 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          <NavLink href="/search" label="Search" active={pathname === "/search"} />
          <NavLink href="/sentence" label="Analyzer" active={pathname === "/sentence"} />
          <NavLink href="/professional" label="Pro Speak" active={pathname === "/professional"} />
          <span className="ml-2 hidden sm:inline-flex badge badge-success">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Private
          </span>
        </nav>
      </div>

      {/* Mobile search bar */}
      {showMobileSearch && (
        <div className="sm:hidden px-4 py-2 bg-white/95 backdrop-blur-xl border-b border-[var(--border-subtle)] animate-slide-down">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              className="input pl-9 py-2 text-[0.8rem] bg-[var(--bg-surface)]"
              type="text"
              placeholder="Search words…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Genre bar */}
      <div className="h-10 flex items-center px-5 lg:px-8 overflow-x-auto scrollbar-hide bg-white/80 backdrop-blur-lg border-b border-[var(--border-subtle)]">
        <GenreTab href="/" label="Home" active={pathname === "/"} />
        <span className="w-px h-4 bg-[var(--border-default)] mx-1.5 shrink-0" />

        {visible.map((g) => (
          <GenreTab key={g.slug} href={`/genre/${g.slug}`} label={g.name} icon={g.icon}
            active={pathname === `/genre/${g.slug}`} />
        ))}

        {others.length > 0 && (
          <div className="relative shrink-0" ref={ref}>
            <button
              onClick={() => setShowOthers(!showOthers)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap
                ${others.some(g => pathname === `/genre/${g.slug}`)
                  ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
            >
              Others
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                className={`transition-transform ${showOthers ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showOthers && (
              <div className="absolute top-full left-0 mt-2 min-w-[220px] py-1.5 rounded-xl bg-white border border-[var(--border-default)] animate-slide-down"
                style={{ boxShadow: "var(--shadow-elevated)" }}>
                {others.map((g) => (
                  <Link key={g.slug} href={`/genre/${g.slug}`} onClick={() => setShowOthers(false)}>
                    <div className={`flex items-center gap-2.5 px-4 py-2.5 text-[0.8rem] transition-colors
                      ${pathname === `/genre/${g.slug}`
                        ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"}`}>
                      <span className="text-sm">{g.icon}</span>
                      <span>{g.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`hidden sm:inline-flex px-3 py-1.5 rounded-md text-xs font-medium transition-all
      ${active
        ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}>
      {label}
    </Link>
  );
}

function GenreTab({ href, label, icon, active }: {
  href: string; label: string; icon?: string; active: boolean;
}) {
  return (
    <Link href={href} className="shrink-0">
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap
        ${active
          ? "text-[var(--accent)] bg-[var(--accent-subtle)] font-semibold"
          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}>
        {icon && <span className="text-[0.75rem]">{icon}</span>}
        {label}
      </span>
    </Link>
  );
}
