"use client";

import { useState } from "react";
import type { QuestionnaireData } from "@/lib/types";

const ISSUES = [
  "Anxiety",
  "Depression",
  "Trauma / PTSD",
  "Relationship issues",
  "Grief / loss",
  "Stress",
  "Work / career",
  "Self-esteem",
  "Life transitions",
  "Family conflict",
  "Substance use",
  "ADHD",
  "OCD",
  "Eating disorders",
  "LGBTQ+ concerns",
  "Grief",
];

const MODALITIES = [
  "CBT",
  "DBT",
  "Psychodynamic",
  "EMDR",
  "Mindfulness-based",
  "ACT",
  "Somatic",
  "Humanistic",
  "No preference",
];

type Props = {
  onSubmit: (data: QuestionnaireData) => void;
  loading: boolean;
  locationFilled: boolean;
  error: string;
};

export default function QuestionnaireForm({
  onSubmit,
  loading,
  locationFilled,
  error,
}: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<QuestionnaireData>({
    primaryIssues: [],
    therapyExperience: "none",
    preferredModality: [],
    sessionFormat: "either",
    insurance: "",
    additionalContext: "",
  });

  function toggleIssue(issue: string) {
    setData((d) => ({
      ...d,
      primaryIssues: d.primaryIssues.includes(issue)
        ? d.primaryIssues.filter((i) => i !== issue)
        : [...d.primaryIssues, issue],
    }));
  }

  function toggleModality(mod: string) {
    if (mod === "No preference") {
      setData((d) => ({ ...d, preferredModality: ["No preference"] }));
      return;
    }
    setData((d) => ({
      ...d,
      preferredModality: d.preferredModality.includes(mod)
        ? d.preferredModality.filter((m) => m !== mod)
        : [...d.preferredModality.filter((m) => m !== "No preference"), mod],
    }));
  }

  const steps = [
    {
      title: "What brings you to therapy?",
      subtitle: "Select all that apply",
      content: (
        <div className="flex flex-wrap gap-2">
          {ISSUES.map((issue) => (
            <button
              key={issue}
              type="button"
              onClick={() => toggleIssue(issue)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                data.primaryIssues.includes(issue)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {issue}
            </button>
          ))}
        </div>
      ),
      valid: data.primaryIssues.length > 0,
    },
    {
      title: "Have you been to therapy before?",
      subtitle: "",
      content: (
        <div className="flex flex-col gap-3">
          {(
            [
              { value: "none", label: "No, this is my first time" },
              { value: "some", label: "Yes, a little" },
              { value: "extensive", label: "Yes, quite a bit" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setData((d) => ({ ...d, therapyExperience: value }))}
              className={`w-full px-5 py-3.5 rounded-xl text-sm font-medium border text-left transition-all ${
                data.therapyExperience === value
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: "Any therapy approach preferences?",
      subtitle: "Select all that interest you",
      content: (
        <div className="flex flex-wrap gap-2">
          {MODALITIES.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => toggleModality(mod)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                data.preferredModality.includes(mod)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      ),
      valid: data.preferredModality.length > 0,
    },
    {
      title: "In-person or telehealth?",
      subtitle: "",
      content: (
        <div className="flex flex-col gap-3">
          {(
            [
              { value: "in-person", label: "In-person" },
              { value: "telehealth", label: "Telehealth (video/phone)" },
              { value: "either", label: "Either works" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setData((d) => ({ ...d, sessionFormat: value }))}
              className={`w-full px-5 py-3.5 rounded-xl text-sm font-medium border text-left transition-all ${
                data.sessionFormat === value
                  ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: "Anything else to share?",
      subtitle: "Optional — helps us find a better match",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Insurance (optional)
            </label>
            <input
              type="text"
              value={data.insurance}
              onChange={(e) =>
                setData((d) => ({ ...d, insurance: e.target.value }))
              }
              placeholder="e.g. Blue Cross, Aetna, self-pay"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Anything else you want a therapist to know?
            </label>
            <textarea
              value={data.additionalContext}
              onChange={(e) =>
                setData((d) => ({ ...d, additionalContext: e.target.value }))
              }
              placeholder="e.g. I prefer someone who has experience with first-generation immigrants, or I need someone available evenings..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>
        </div>
      ),
      valid: true,
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  return (
    <div>
      {/* Progress bar */}
      <div className="flex gap-1.5 mb-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i <= step ? "bg-indigo-600" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {currentStep.title}
      </h3>
      {currentStep.subtitle && (
        <p className="text-sm text-gray-500 mb-4">{currentStep.subtitle}</p>
      )}

      <div className="mb-6">{currentStep.content}</div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}
        {isLastStep ? (
          <button
            type="button"
            onClick={() => onSubmit(data)}
            disabled={loading || !locationFilled}
            className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Finding therapists..." : "Find therapists"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!currentStep.valid}
            className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
