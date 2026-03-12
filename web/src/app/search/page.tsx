"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import TherapistCard from "@/components/TherapistCard";
import type { TherapistResult } from "@/lib/search";

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();

  let results: TherapistResult[] = [];
  let enhancedQuery = "";
  let rawQuery = "";

  try {
    const encoded = searchParams.get("results");
    if (encoded) {
      const data = JSON.parse(decodeURIComponent(encoded));
      results = data.results ?? [];
      enhancedQuery = data.enhancedQuery ?? "";
      rawQuery = data.query ?? "";
    }
  } catch {
    // invalid params, show empty state
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            New search
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {results.length} therapist{results.length !== 1 ? "s" : ""} found
            </h1>
            {rawQuery && (
              <p className="text-sm text-gray-500 truncate max-w-lg">
                {rawQuery.length > 80 ? rawQuery.slice(0, 80) + "…" : rawQuery}
              </p>
            )}
          </div>
        </div>

        {enhancedQuery && enhancedQuery !== rawQuery && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
              How we understood your request
            </p>
            <p className="text-sm text-indigo-900">{enhancedQuery}</p>
          </div>
        )}

        {results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-500 mb-4">
              No therapists found for this location yet.
            </p>
            <p className="text-sm text-gray-400">
              Try a different city or zip code.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {results.map((t) => (
              <TherapistCard key={t.id} therapist={t} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
