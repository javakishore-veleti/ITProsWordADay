"use client";

import { useState, useCallback, useEffect } from "react";
import { type Word } from "@/lib/data";

const HISTORY_KEY = "word_a_day_history";
const MAX_HISTORY = 25;

function getHistory(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveHistory(history: string[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch { }
}

/**
 * Hook to manage the current displayed word and navigate to the next word
 * without repeating the last 25 words.
 */
export function useWordRotation(initialWord: Word, availableWords: Word[]) {
    const [currentWord, setCurrentWord] = useState<Word>(initialWord);

    // Initialize history with the initial word if not present
    useEffect(() => {
        const history = getHistory();
        if (!history.includes(initialWord.id)) {
            const newHistory = [initialWord.id, ...history].slice(0, MAX_HISTORY);
            saveHistory(newHistory);
        }
    }, [initialWord]);

    const nextWord = useCallback(() => {
        const history = getHistory();

        // Find words we haven't seen recently
        let unseenWords = availableWords.filter(w => !history.includes(w.id));

        // If we've seen everything (or all available words are in history),
        // we can reset or just pick the oldest from history that is in availableWords.
        // Easiest is to just clear history or pick a random word if unseen is empty.
        if (unseenWords.length === 0) {
            if (availableWords.length > 1) {
                // Exclude the currently displayed word so it at least changes
                unseenWords = availableWords.filter(w => w.id !== currentWord.id);
            } else {
                unseenWords = availableWords;
            }
        }

        // Pick a random word from the unseen ones
        const randomIndex = Math.floor(Math.random() * unseenWords.length);
        const next = unseenWords[randomIndex];

        // Update history
        const newHistory = [next.id, ...history].slice(0, MAX_HISTORY);
        saveHistory(newHistory);

        setCurrentWord(next);
    }, [availableWords, currentWord]);

    return { currentWord, nextWord };
}
