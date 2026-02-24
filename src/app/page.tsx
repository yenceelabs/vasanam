import type { Metadata } from "next";
import SearchBox from "@/components/SearchBox";
import TrendingSearches from "@/components/TrendingSearches";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Vasanam — Search Tamil Movie Dialogues",
  description:
    "Search any Tamil movie dialogue and land on the exact YouTube moment. Famous Rajinikanth, Kamal Haasan, Vijay, Ajith dialogues — in Tamil, Tanglish, or English.",
  openGraph: {
    title: "Vasanam — Search Tamil Movie Dialogues",
    description: "Type any dialogue. Watch the exact scene.",
    images: [{ url: "/api/og?title=%E0%AE%B5%E0%AE%9A%E0%AE%A9%E0%AE%AE%E0%AF%8D&subtitle=Search+Tamil+Movie+Dialogues", width: 1200, height: 630 }],
  },
};

const FEATURED_ACTORS = [
  { name: "Rajinikanth", slug: "rajinikanth", emoji: "🦁" },
  { name: "Kamal Haasan", slug: "kamal-haasan", emoji: "🎭" },
  { name: "Vijay", slug: "vijay", emoji: "⚡" },
  { name: "Ajith Kumar", slug: "ajith-kumar", emoji: "🔥" },
  { name: "Vadivelu", slug: "vadivelu", emoji: "😂" },
  { name: "Vikram", slug: "vikram", emoji: "🗡️" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            <span className="text-white">வசனம்</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mt-2 font-light">
            Vasanam
          </p>
        </div>

        {/* Tagline */}
        <p className="text-lg md:text-2xl text-gray-300 mb-3 max-w-xl">
          Type any Tamil movie dialogue.
          <br />
          <span className="text-[#E63946] font-semibold">
            Watch the exact scene.
          </span>
        </p>
        <p className="text-sm text-gray-500 mb-10">
          Tamil · Tanglish · English — all three
        </p>

        {/* Search Box */}
        <div className="w-full max-w-2xl">
          <SearchBox autoFocus />
        </div>

        {/* Sample searches */}
        <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-xl">
          {[
            "en vazhi thani vazhi",
            "naane varuvein",
            "mind voice",
            "whistle podu",
          ].map((sample) => (
            <Link
              key={sample}
              href={`/search?q=${encodeURIComponent(sample)}`}
              className="px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-[#E63946] transition-colors"
            >
              {sample}
            </Link>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="border-t border-[#1A1A1A] px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <TrendingSearches />
        </div>
      </div>

      {/* Actor browsing */}
      <div className="border-t border-[#1A1A1A] px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Browse by Actor
          </h2>
          <div className="flex flex-wrap gap-3">
            {FEATURED_ACTORS.map((actor) => (
              <Link
                key={actor.slug}
                href={`/actor/${actor.slug}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#E63946] hover:text-white transition-colors text-gray-300 text-sm"
              >
                <span>{actor.emoji}</span>
                <span>{actor.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] px-4 py-6 text-center text-xs text-gray-600">
        <p>
          Vasanam — Tamil movie dialogue search.{" "}
          <a
            href="https://yenceelabs.com"
            className="hover:text-gray-400 transition-colors"
          >
            By Yencee Labs
          </a>
        </p>
      </footer>
    </main>
  );
}
