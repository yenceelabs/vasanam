import Link from "next/link";

// Static trending list for v1 — will be replaced with DB-driven trending
const TRENDING = [
  "en vazhi thani vazhi",
  "naane varuvein",
  "rajini attitude dialogue",
  "vikram climax dialogue",
  "kamal haasan speech",
  "vadivelu comedy",
  "master dialogue",
  "vijay speech",
  "ajith dialogue",
  "mersal climax",
];

export default function TrendingSearches() {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-[#E63946]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        Trending
      </h2>
      <div className="flex flex-wrap gap-2">
        {TRENDING.map((term) => (
          <Link
            key={term}
            href={`/search?q=${encodeURIComponent(term)}`}
            className="px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-[#E63946] transition-colors"
          >
            🔥 {term}
          </Link>
        ))}
      </div>
    </div>
  );
}
