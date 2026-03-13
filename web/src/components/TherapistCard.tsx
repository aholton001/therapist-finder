"use client";

import { useState } from "react";
import Image from "next/image";
import type { TherapistResult } from "@/lib/search";
import IntroMessageModal from "./IntroMessageModal";

type Props = {
  therapist: TherapistResult;
  userQuery: string;
};

type ExplanationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error" };

export default function TherapistCard({ therapist, userQuery }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationState>({ status: "idle" });
  const [showExplanation, setShowExplanation] = useState(false);

  const {
    name,
    credentials,
    bio,
    photoUrl,
    city,
    state,
    specialties,
    issues,
    therapyTypes,
    insurance,
    telehealth,
    inPerson,
    ptProfileUrl,
    similarity,
  } = therapist;

  const SIMILARITY_MIN = 0.0;
  const SIMILARITY_MAX = 0.65;
  const matchPercent = Math.min(
    100,
    Math.round(((similarity - SIMILARITY_MIN) / (SIMILARITY_MAX - SIMILARITY_MIN)) * 100)
  );

  const matchBucket =
    matchPercent >= 75
      ? { label: "Strong Match", className: "bg-green-100 text-green-800" }
      : matchPercent >= 55
      ? { label: "Good Match", className: "bg-indigo-100 text-indigo-800" }
      : matchPercent >= 35
      ? { label: "Fair Match", className: "bg-amber-100 text-amber-800" }
      : { label: "Possible Match", className: "bg-gray-100 text-gray-600" };

  async function handleWhyMatch() {
    if (showExplanation) {
      setShowExplanation(false);
      return;
    }
    setShowExplanation(true);
    if (explanation.status !== "idle") return;

    setExplanation({ status: "loading" });
    try {
      const res = await fetch("/api/match-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery,
          therapist: { name, bio, specialties, issues, therapyTypes },
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExplanation({ status: "done", text: data.explanation });
    } catch {
      setExplanation({ status: "error" });
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex gap-5 hover:shadow-md transition-shadow">
        <div className="shrink-0">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              width={80}
              height={80}
              className="rounded-full object-cover w-20 h-20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-semibold">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {name}
                {credentials && (
                  <span className="text-gray-500 font-normal text-sm ml-1">
                    {credentials}
                  </span>
                )}
              </h3>
              {(city || state) && (
                <p className="text-gray-500 text-sm">
                  {[city, state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <button
                onClick={handleWhyMatch}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-80 ${matchBucket.className}`}
              >
                {matchBucket.label}
                <span className="text-xs opacity-60">
                  {showExplanation ? "▲" : "▼"}
                </span>
              </button>
              <div className="flex gap-1 mt-1 justify-end">
                {inPerson && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    In-person
                  </span>
                )}
                {telehealth && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                    Telehealth
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Why this match explanation */}
          {showExplanation && (
            <div className="mt-3 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-900">
              {explanation.status === "loading" && (
                <span className="flex items-center gap-2 text-indigo-500">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analyzing match...
                </span>
              )}
              {explanation.status === "done" && explanation.text}
              {explanation.status === "error" && (
                <span className="text-red-500">Couldn't load explanation.</span>
              )}
            </div>
          )}

          {bio && (
            <p className="mt-2 text-gray-600 text-sm line-clamp-3">{bio}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {specialties.slice(0, 4).map((s) => (
              <span
                key={s}
                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
              >
                {s}
              </span>
            ))}
            {specialties.length > 4 && (
              <span className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-full text-xs">
                +{specialties.length - 4} more
              </span>
            )}
          </div>

          {therapyTypes.length > 0 && (
            <p className="mt-2 text-gray-500 text-xs">
              Approaches: {therapyTypes.slice(0, 3).join(", ")}
              {therapyTypes.length > 3 && ` +${therapyTypes.length - 3} more`}
            </p>
          )}

          {insurance.length > 0 && (
            <p className="mt-1 text-gray-500 text-xs">
              Insurance: {insurance.slice(0, 3).join(", ")}
              {insurance.length > 3 && ` +${insurance.length - 3} more`}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4">
            <a
              href={ptProfileUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View profile
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Draft intro message
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <IntroMessageModal
          therapist={therapist}
          userQuery={userQuery}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
