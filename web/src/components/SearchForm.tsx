"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionnaireForm from "./QuestionnaireForm";
import { questionnaireToQuery, type QuestionnaireData } from "@/lib/types";

type Mode = "freeform" | "questionnaire";

export default function SearchForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("freeform");
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  function submitSearch(q: string) {
    setLoading(true);
    const params = new URLSearchParams({ location, query: q });
    router.push(`/search?${params.toString()}`);
  }

  function handleFreeformSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitSearch(query);
  }

  function handleQuestionnaireSubmit(questionnaire: QuestionnaireData) {
    submitSearch(questionnaireToQuery(questionnaire));
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
        <button
          onClick={() => setMode("freeform")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "freeform"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Describe yourself
        </button>
        <button
          onClick={() => setMode("questionnaire")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mode === "questionnaire"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Answer questions
        </button>
      </div>

      {/* Location (shared between modes) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="New York, NY or 10001"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
        />
      </div>

      {mode === "freeform" ? (
        <form onSubmit={handleFreeformSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tell us about yourself and what you&apos;re looking for
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. I'm going through a difficult breakup and struggling with anxiety. I've never been to therapy before and would prefer someone warm and non-judgmental who does telehealth sessions..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400 resize-none"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              The more detail you share, the better the match. Everything is
              private.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !location || query.length < 10}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Finding therapists..." : "Find therapists"}
          </button>
        </form>
      ) : (
        <QuestionnaireForm
          onSubmit={handleQuestionnaireSubmit}
          loading={loading}
          locationFilled={location.length >= 2}
          error=""
        />
      )}
    </div>
  );
}
