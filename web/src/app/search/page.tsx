import Link from "next/link";
import SearchResults from "./SearchResults";

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

  return (
    <SearchResults
      location={location}
      query={query}
      insurance={insurance}
      format={format}
    />
  );
}
