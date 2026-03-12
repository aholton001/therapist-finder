"use client";

import Image from "next/image";
import type { TherapistResult } from "@/lib/search";

type Props = {
  therapist: TherapistResult;
};

export default function TherapistCard({ therapist }: Props) {
  const {
    name,
    credentials,
    bio,
    photoUrl,
    city,
    state,
    specialties,
    therapyTypes,
    insurance,
    telehealth,
    inPerson,
    ptProfileUrl,
    similarity,
  } = therapist;

  const matchPercent = Math.round(similarity * 100);

  return (
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
            <div className="text-sm font-medium text-indigo-600">
              {matchPercent}% match
            </div>
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

        <div className="mt-4">
          <a
            href={ptProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View full profile on Psychology Today
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
