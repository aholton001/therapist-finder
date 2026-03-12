import SearchForm from "@/components/SearchForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Find your therapist
          </h1>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Describe what you&apos;re going through and we&apos;ll match you
            with therapists in your area.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <SearchForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Therapist profiles are sourced from{" "}
          <span className="text-gray-500">Psychology Today</span>. Matching
          uses AI to find the best fit — not ads or referral fees.
        </p>
      </div>
    </main>
  );
}
