"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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

export function useWordRotation(initialWord: Word, availableWords: Word[]) {
    const [currentWord, setCurrentWord] = useState<Word>(initialWord);
    const sessionStack = useRef<string[]>([initialWord.id]);
    const stackIndex = useRef(0);

    useEffect(() => {
        const history = getHistory();
        if (!history.includes(initialWord.id)) {
            const newHistory = [initialWord.id, ...history].slice(0, MAX_HISTORY);
            saveHistory(newHistory);
        }
    }, [initialWord]);

    const nextWord = useCallback(() => {
        if (stackIndex.current > 0) {
            stackIndex.current--;
            const prevId = sessionStack.current[stackIndex.current];
            const found = availableWords.find(w => w.id === prevId);
            if (found) { setCurrentWord(found); return; }
        }

        const history = getHistory();
        let unseenWords = availableWords.filter(w => !history.includes(w.id));
        if (unseenWords.length === 0) {
            unseenWords = availableWords.length > 1
                ? availableWords.filter(w => w.id !== currentWord.id)
                : availableWords;
        }

        const next = unseenWords[Math.floor(Math.random() * unseenWords.length)];
        const newHistory = [next.id, ...history].slice(0, MAX_HISTORY);
        saveHistory(newHistory);

        sessionStack.current = [next.id, ...sessionStack.current];
        stackIndex.current = 0;
        setCurrentWord(next);
    }, [availableWords, currentWord]);

    const prevWord = useCallback(() => {
        if (stackIndex.current < sessionStack.current.length - 1) {
            stackIndex.current++;
            const id = sessionStack.current[stackIndex.current];
            const found = availableWords.find(w => w.id === id);
            if (found) setCurrentWord(found);
        }
    }, [availableWords]);

    const hasPrev = stackIndex.current < sessionStack.current.length - 1;

    return { currentWord, nextWord, prevWord, hasPrev };
}
