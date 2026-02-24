import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase";
import SearchBox from "@/components/SearchBox";
import SearchResults from "@/components/SearchResults";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q || "";
  return {
    title: q ? `"${q}" — Tamil dialogue search` : "Search Tamil dialogues",
    description: q
      ? `Search results for "${q}" — find the exact Tamil movie scene on YouTube`
      : "Search any Tamil movie dialogue and watch the exact scene",
    robots: q ? "noindex" : "index",
  };
}

async function getSearchResults(query: string, page: number) {
  if (!query.trim()) return { results: [], total: 0 };

  const supabase = createServiceClient();
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data, error } = await supabase.rpc("search_dialogues", {
    search_query: query,
    result_limit: limit,
    result_offset: offset,
  });

  if (error) {
    console.error("Search error:", error);
    return { results: [], total: 0 };
  }

  return { results: data || [], total: data?.length || 0 };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q || "";
  const page = parseInt(params.page || "1");

  const { results, total } = await getSearchResults(query, page);

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0F0F0F]/90 backdrop-blur border-b border-[#1A1A1A] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="text-lg font-bold text-white hover:text-[#E63946] transition-colors flex-shrink-0"
          >
            வசனம்
          </Link>
          <div className="flex-1">
            <SearchBox defaultValue={query} size="compact" />
          </div>
        </div>
      </header>

      {/* Results */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {query ? (
          <>
            <p className="text-sm text-gray-500 mb-6">
              {results.length > 0
                ? `Found ${results.length} scenes for "${query}"`
                : `No results for "${query}"`}
            </p>
            <SearchResults results={results} />

            {results.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg mb-4">
                  No dialogues found for &ldquo;{query}&rdquo;
                </p>
                <p className="text-gray-600 text-sm mb-8">
                  Try searching in Tamil script, Tanglish, or English
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["en vazhi thani vazhi", "naane varuvein", "whistle podu"].map(
                    (s) => (
                      <Link
                        key={s}
                        href={`/search?q=${encodeURIComponent(s)}`}
                        className="px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {s}
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-400">Enter a dialogue to search</p>
          </div>
        )}
      </div>
    </main>
  );
}
