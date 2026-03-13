"use client";

import { useEffect, useRef, useState } from "react";
import type { TherapistResult } from "@/lib/search";

type Props = {
  therapist: TherapistResult;
  userQuery: string;
  onClose: () => void;
};

export default function IntroMessageModal({ therapist, userQuery, onClose }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function generate() {
      try {
        const res = await fetch("/api/intro-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userQuery,
            therapist: {
              name: therapist.name,
              credentials: therapist.credentials,
              bio: therapist.bio,
              specialties: therapist.specialties,
              therapyTypes: therapist.therapyTypes,
              city: therapist.city,
              state: therapist.state,
            },
          }),
        });
        if (!res.ok) throw new Error("Failed to generate");
        const data = await res.json();
        setMessage(data.message);
      } catch {
        setError("Something went wrong generating the message. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    generate();
  }, [therapist, userQuery]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyToClipboard() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Intro message</h2>
            <p className="text-sm text-gray-500 mt-0.5">To {therapist.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4 mt-0.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span className="text-sm">Drafting your message...</span>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && (
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
          )}
        </div>

        {/* Footer */}
        {message && (
          <div className="p-6 pt-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy to clipboard
                </>
              )}
            </button>
            <a
              href={`mailto:?subject=Inquiry about therapy&body=${encodeURIComponent(message)}`}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Open in email
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
