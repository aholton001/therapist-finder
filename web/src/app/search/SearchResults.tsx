"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Suspense } from "react";
import Link from "next/link";
import TherapistCard from "@/components/TherapistCard";
import FilterBar from "@/components/FilterBar";
import { normalizeLocation } from "@/lib/location";
import type { TherapistResult } from "@/lib/search";

type Props = {
  location: string;
  insurance?: string;
  format?: string;
};

type ScrapePhase =
  | { phase: "idle" }
  | { phase: "triggering" }
  | { phase: "polling"; jobId: string }
  | { phase: "reloading" }
  | { phase: "no_city" }
  | { phase: "not_found" }
  | { phase: "error"; message: string };

export default function SearchResults({ location, insurance, format }: Props) {
  const [query, setQuery] = useState<string | null>(null);
  const [results, setResults] = useState<TherapistResult[] | null>(null);
  const [insuranceOptions, setInsuranceOptions] = useState<string[]>([]);
  const [enhancedQuery, setEnhancedQuery] = useState<string>("");
  const [scrapePhase, setScrapePhase] = useState<ScrapePhase>({ phase: "idle" });
  const [loadingMore, setLoadingMore] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setQuery(sessionStorage.getItem("search_query") ?? "");
  }, []);

  const sessionFormat =
    format === "in-person" || format === "telehealth" ? format : undefined;

  const runSearch = useCallback(async () => {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "freeform",
        location,
        query,
        ...(insurance ? { insurance } : {}),
        ...(sessionFormat ? { sessionFormat } : {}),
      }),
    });
    if (!res.ok) throw new Error("Search failed");
    return res.json() as Promise<{ results: TherapistResult[]; enhancedQuery: string }>;
  }, [location, query, insurance, sessionFormat]);

  const fetchInsuranceOptions = useCallback(async () => {
    const res = await fetch(`/api/insurance-options?location=${encodeURIComponent(location)}`);
    if (res.ok) {
      const data = await res.json();
      setInsuranceOptions(data.options ?? []);
    }
  }, [location]);

  useEffect(() => {
    if (query === null) return;
    let cancelled = false;

    async function init() {
      try {
        const { results: initial, enhancedQuery: eq } = await runSearch();
        if (cancelled) return;

        setEnhancedQuery(eq);
        await fetchInsuranceOptions();

        if (initial.length > 0) {
          setResults(initial);
          return;
        }

        // 0 results — try to scrape this city
        const slugs = normalizeLocation(location);
        if (!slugs) {
          setResults([]);
          setScrapePhase({ phase: "no_city" });
          return;
        }

        setScrapePhase({ phase: "triggering" });
        const triggerRes = await fetch("/api/trigger-scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slugs),
        });

        if (!triggerRes.ok) {
          setResults([]);
          setScrapePhase({ phase: "error", message: "Scraper unavailable" });
          return;
        }

        const { job_id } = await triggerRes.json();
        setScrapePhase({ phase: "polling", jobId: job_id });

        pollRef.current = setInterval(async () => {
          if (cancelled) return;
          try {
            const statusRes = await fetch(`/api/scrape-status?job_id=${job_id}`);
            if (!statusRes.ok) return;
            const status = await statusRes.json();

            if (status.status === "partial") {
              const { results: partial } = await runSearch();
              if (cancelled) return;
              if (partial.length > 0) {
                setResults(partial);
                setScrapePhase({ phase: "idle" });
                setLoadingMore(true);
              }
            } else if (status.status === "done") {
              clearInterval(pollRef.current!);
              setLoadingMore(false);
              const { results: fresh } = await runSearch();
              if (cancelled) return;
              await fetchInsuranceOptions();
              setResults(fresh);
              setScrapePhase(fresh.length === 0 ? { phase: "not_found" } : { phase: "idle" });
            } else if (status.status === "error") {
              clearInterval(pollRef.current!);
              setResults([]);
              setScrapePhase({ phase: "error", message: status.error ?? "Scrape failed" });
            }
          } catch {
            // poll silently, retry next interval
          }
        }, 3000);
      } catch {
        if (!cancelled) {
          setResults([]);
          setScrapePhase({ phase: "error", message: "Something went wrong" });
        }
      }
    }

    init();
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [location, query, insurance, sessionFormat, runSearch, fetchInsuranceOptions]);

  const city = location.split(",")[0];
  const isLoading =
    results === null ||
    scrapePhase.phase === "triggering" ||
    scrapePhase.phase === "polling" ||
    scrapePhase.phase === "reloading";

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="flex justify-center mb-4">
              <svg className="w-6 h-6 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg">
              {scrapePhase.phase === "reloading"
                ? "Done! Loading your results..."
                : `Finding therapists in ${city}…`}
            </p>
            {(scrapePhase.phase === "polling" || scrapePhase.phase === "triggering") && (
              <p className="text-sm text-gray-400 mt-2">
                This is a new city — scraping Psychology Today now. Takes about 2 minutes.
              </p>
            )}
          </div>
        </div>
      </main>
    );
  }

  const emptyMessage =
    scrapePhase.phase === "no_city"
      ? { title: "Enter a city and state to search", sub: 'e.g. "Brooklyn, NY" or "Austin, TX"' }
      : scrapePhase.phase === "not_found"
      ? { title: `No therapists found in ${city} yet`, sub: "Psychology Today may not have listings for this area." }
      : scrapePhase.phase === "error"
      ? { title: "Something went wrong", sub: (scrapePhase as { phase: "error"; message: string }).message }
      : results!.length === 0
      ? { title: "No therapists match these filters", sub: "Try removing a filter." }
      : null;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            New search
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">
              {results!.length} therapist{results!.length !== 1 ? "s" : ""} in {location}
            </h1>
            {query && (
              <p className="text-sm text-gray-500 truncate">
                {query.length > 80 ? query.slice(0, 80) + "…" : query}
              </p>
            )}
          </div>
        </div>

        {enhancedQuery && enhancedQuery !== query && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
              How we understood your request
            </p>
            <p className="text-sm text-indigo-900">{enhancedQuery}</p>
          </div>
        )}

        <Suspense>
          <FilterBar
            insuranceOptions={insuranceOptions}
            currentInsurance={insurance ?? null}
            currentFormat={sessionFormat ?? null}
          />
        </Suspense>

        {loadingMore && (
          <div className="flex items-center gap-2 text-sm text-indigo-600 mb-4">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Finding more therapists in the background…
          </div>
        )}

        {emptyMessage ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-700 font-medium">{emptyMessage.title}</p>
            <p className="text-sm text-gray-400 mt-2">{emptyMessage.sub}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {results!.map((t) => (
              <TherapistCard key={t.id} therapist={t} userQuery={query ?? ""} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
