import { Suspense } from "react";
import SearchClient from "./SearchClient";

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="animate-fade-in max-w-3xl mx-auto">
                <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            </div>
        }>
            <SearchClient />
        </Suspense>
    );
}
