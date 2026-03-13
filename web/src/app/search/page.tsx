import { Suspense } from "react";
import Link from "next/link";
import TherapistCard from "@/components/TherapistCard";
import FilterBar from "@/components/FilterBar";
import { searchTherapists, getInsuranceOptions } from "@/lib/search";

type Props = {
  searchParams: Promise<{
    location?: string;
    query?: string;
    insurance?: string;
    format?: string;
  }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const { location, query, insurance, format } = await searchParams;

  if (!location || !query) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No search parameters provided.</p>
          <Link href="/" className="text-indigo-600 hover:underline">
            Start a new search
          </Link>
        </div>
      </main>
    );
  }

  const sessionFormat =
    format === "in-person" || format === "telehealth" ? format : null;

  const [{ results, enhancedQuery }, insuranceOptions] = await Promise.all([
    searchTherapists({
      location,
      query,
      insurance: insurance ?? null,
      sessionFormat,
      useEnhancement: true,
    }),
    getInsuranceOptions(location),
  ]);

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
              {results.length} therapist{results.length !== 1 ? "s" : ""} in {location}
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
            currentFormat={sessionFormat}
          />
        </Suspense>

        {results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-500 mb-2">No therapists found matching these filters.</p>
            <p className="text-sm text-gray-400">Try removing a filter or searching a different location.</p>
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
