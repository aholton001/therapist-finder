"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type TherapistData = {
  id: string;
  name: string;
  credentials: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  telehealth: boolean;
  inPerson: boolean;
  insurance: string[];
};

function EditForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [therapist, setTherapist] = useState<TherapistData | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "invalid">("loading");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [bio, setBio] = useState("");
  const [telehealth, setTelehealth] = useState(false);
  const [inPerson, setInPerson] = useState(true);
  const [insurance, setInsurance] = useState("");

  useEffect(() => {
    if (!token) { setLoadStatus("invalid"); return; }
    fetch(`/api/claim/verify?token=${token}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setTherapist(data.therapist);
        setBio(data.therapist.bio ?? "");
        setTelehealth(data.therapist.telehealth);
        setInPerson(data.therapist.inPerson);
        setInsurance(data.therapist.insurance?.join(", ") ?? "");
        setLoadStatus("ready");
      })
      .catch(() => setLoadStatus("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus("saving");
    const res = await fetch("/api/claim/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, bio, telehealth, inPerson, insurance }),
    });
    setSaveStatus(res.ok ? "saved" : "error");
  }

  if (loadStatus === "loading") {
    return <p className="text-gray-500 text-center">Verifying your link…</p>;
  }

  if (loadStatus === "invalid") {
    return (
      <div className="text-center">
        <p className="text-gray-700 font-medium">This link is invalid or has expired.</p>
        <p className="text-sm text-gray-400 mt-2">Request a new claim link from your profile page.</p>
      </div>
    );
  }

  if (saveStatus === "saved") {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile updated!</h2>
        <p className="text-gray-500">Your profile is now live with your information.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Edit your profile</h1>
      <p className="text-gray-500 mb-8">
        {therapist?.name}{therapist?.credentials ? `, ${therapist.credentials}` : ""} · {therapist?.city}, {therapist?.state}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            About you
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            required
            rows={6}
            placeholder="Describe your practice, approach, and the clients you work with…"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session format
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={telehealth} onChange={(e) => setTelehealth(e.target.checked)} className="rounded" />
              Telehealth
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={inPerson} onChange={(e) => setInPerson(e.target.checked)} className="rounded" />
              In-person
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Insurance accepted
            <span className="font-normal text-gray-400 ml-1">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
            placeholder="Aetna, Cigna, Blue Cross, Out of pocket…"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
          />
        </div>

        {saveStatus === "error" && (
          <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={saveStatus === "saving" || !bio}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saveStatus === "saving" ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}

export default function ClaimEditPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl border border-gray-100 p-10 w-full max-w-lg">
        <Suspense>
          <EditForm />
        </Suspense>
      </div>
    </main>
  );
}
