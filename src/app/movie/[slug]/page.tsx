import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { formatTimestamp } from "@/lib/search";
import { parseSlug } from "@/lib/slug";
import SearchBox from "@/components/SearchBox";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getMovieBySlug(slug: string) {
  const supabase = createServiceClient();

  // First try exact slug match (when DB has a `slug` column)
  const { data: exactMatch } = await supabase
    .from("vasanam_movies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (exactMatch) return exactMatch;

  // Fallback: parse slug into title pattern + year for ILIKE match
  const parsed = parseSlug(slug);
  if (!parsed) return null;

  const { data } = await supabase
    .from("vasanam_movies")
    .select("*")
    .ilike("title", parsed.titlePattern)
    .eq("year", parsed.year)
    .maybeSingle(); // use maybeSingle — no error on 0 or null results

  return data;
}

async function getMovieSegments(movieId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("vasanam_segments")
    .select("id, text, start_ms, language")
    .eq("movie_id", movieId)
    .order("start_ms")
    .limit(100);

  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);
  if (!movie) return { title: "Movie not found" };

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vasanam.vercel.app";
  const ogImage = movie.poster_url
    ? movie.poster_url
    : `${BASE_URL}/api/og?title=${encodeURIComponent(movie.title + " (" + movie.year + ")")}&subtitle=${encodeURIComponent("Tamil Movie Dialogues")}`;

  return {
    title: `${movie.title} (${movie.year}) Dialogues — Search famous lines`,
    description: `Search all ${movie.title} dialogues and watch the exact scene on YouTube. Famous lines from ${movie.actors?.slice(0, 2).join(", ")} — find any dialogue instantly on Vasanam.`,
    openGraph: {
      title: `${movie.title} Dialogues`,
      description: `Find any ${movie.title} dialogue and watch the exact YouTube moment`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${movie.title} Dialogues` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${movie.title} (${movie.year}) Dialogues`,
      description: `Find any ${movie.title} dialogue and watch the exact YouTube moment`,
      images: [ogImage],
    },
  };
}

export default async function MoviePage({ params }: Props) {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);
  if (!movie) notFound();

  const segments = await getMovieSegments(movie.id);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    dateCreated: String(movie.year),
    director: movie.director ? { "@type": "Person", name: movie.director } : undefined,
    actor: movie.actors?.map((a: string) => ({ "@type": "Person", name: a })),
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0F0F0F]/90 backdrop-blur border-b border-[#1A1A1A] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-white hover:text-[#E63946] transition-colors flex-shrink-0">
            வசனம்
          </Link>
          <div className="flex-1">
            <SearchBox size="compact" />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-gray-400">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-400">{movie.title}</span>
        </nav>

        {/* Movie header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {movie.title}
            {movie.title_tamil && (
              <span className="ml-3 text-gray-500 tamil-text text-2xl font-normal">
                {movie.title_tamil}
              </span>
            )}
          </h1>
          <p className="text-gray-400">
            {movie.year}
            {movie.director && ` · Directed by ${movie.director}`}
          </p>
          {movie.actors?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {movie.actors.map((actor: string) => {
                const actorSlug = actor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <Link
                    key={actor}
                    href={`/actor/${actorSlug}`}
                    className="px-3 py-1 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-[#E63946] transition-colors"
                  >
                    {actor}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialogue list */}
        <h2 className="text-lg font-semibold text-white mb-4">
          {segments.length} Dialogues Found
        </h2>

        <div className="space-y-2">
          {segments.map((seg) => (
            <Link
              key={seg.id}
              href={`/d/${seg.id}`}
              className="block bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 hover:border-[#E63946] transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-2 flex-1">
                  &ldquo;{seg.text}&rdquo;
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-600">{formatTimestamp(seg.start_ms)}</span>
                  <div className="w-6 h-6 rounded-full bg-[#E63946]/20 group-hover:bg-[#E63946] flex items-center justify-center transition-colors">
                    <svg className="w-3 h-3 text-[#E63946] group-hover:text-white ml-0.5 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {segments.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No dialogues indexed yet. Check back soon!
          </p>
        )}
      </div>
    </main>
  );
}
