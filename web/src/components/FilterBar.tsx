"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  insuranceOptions: string[];
  currentInsurance: string | null;
  currentFormat: string | null;
};

export default function FilterBar({ insuranceOptions, currentInsurance, currentFormat }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  }

  return (
    <div className={`flex flex-wrap gap-3 mb-6 transition-opacity ${isPending ? "opacity-50" : ""}`}>
      {/* Insurance filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Insurance</label>
        <select
          value={currentInsurance ?? ""}
          onChange={(e) => updateFilter("insurance", e.target.value || null)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">Any</option>
          {insuranceOptions.map((ins) => (
            <option key={ins} value={ins}>
              {ins}
            </option>
          ))}
        </select>
      </div>

      {/* Session format filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Format</label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {([
            { value: null, label: "Any" },
            { value: "in-person", label: "In-person" },
            { value: "telehealth", label: "Telehealth" },
          ] as const).map(({ value, label }) => (
            <button
              key={label}
              onClick={() => updateFilter("format", value)}
              className={`px-3 py-2 text-sm transition-colors ${
                currentFormat === value
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear filters */}
      {(currentInsurance || currentFormat) && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("insurance");
            params.delete("format");
            startTransition(() => router.push(`/search?${params.toString()}`));
          }}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
