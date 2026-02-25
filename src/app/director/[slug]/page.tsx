import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import SearchBox from "@/components/SearchBox";
import Link from "next/link";
import Image from "next/image";
import { getYouTubeThumbnail } from "@/lib/search";

interface Props {
  params: Promise<{ slug: string }>;
}

function slugToDirectorName(slug: string): string {
  // Convert kebab-case slug back to display name
  // e.g. "k-s-ravikumar" → "K. S. Ravikumar", "mani-ratnam" → "Mani Ratnam"
  return slug
    .split("-")
    .map((part) => {
      if (part.length <= 2) return part.toUpperCase() + ".";
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ")
    .replace(/\.\s\./g, ". "); // clean up "K. . S." artifacts
}

async function getDirectorMovies(slug: string) {
  const supabase = createServiceClient();

  // Try multiple name variants for the slug
  const nameVariant = slugToDirectorName(slug);

  // Fetch all movies then filter by director (case-insensitive slug match)
  const { data } = await supabase
    .from("vasanam_movies")
    .select("id, title, title_tamil, year, youtube_video_id, poster_url, actors, director")
    .order("year", { ascending: false });

  if (!data) return null;

  // Match director by normalizing to slug and comparing
  const toSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const movies = data.filter((m) => m.director && toSlug(m.director) === slug);

  if (movies.length === 0) return null;

  // Use the director name from the first matched movie (authoritative)
  const directorName = movies[0].director as string;

  return { directorName, movies };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getDirectorMovies(slug);
  if (!result) return { title: "Director not found" };

  const { directorName, movies } = result;
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vasanam.vercel.app";
  const ogImage = `${BASE_URL}/api/og?title=${encodeURIComponent(directorName)}&subtitle=${encodeURIComponent(`${movies.length} Movies · Tamil Movie Dialogues`)}`;

  return {
    title: `${directorName} Movies — Dialogues and famous scenes`,
    description: `Search all dialogues from ${directorName} movies. ${movies.length} films indexed with famous lines and iconic scenes. Watch exact YouTube moments on Vasanam.`,
    openGraph: {
      title: `${directorName} Movies`,
      description: `Find any dialogue from ${directorName}'s films and watch the exact scene`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${directorName} Movies` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${directorName} Movies — Dialogues and famous scenes`,
      description: `Search dialogues from ${movies.length} ${directorName} movies`,
      images: [ogImage],
    },
  };
}

export default async function DirectorPage({ params }: Props) {
  const { slug } = await params;
  const result = await getDirectorMovies(slug);
  if (!result) notFound();

  const { directorName, movies } = result;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: directorName,
    jobTitle: "Film Director",
    nationality: "Indian",
    knowsAbout: "Tamil Cinema",
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

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
        <nav className="text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-gray-400">Home</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-400">{directorName}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {directorName} Movies
          </h1>
          <p className="text-gray-400">
            {movies.length} {movies.length === 1 ? "movie" : "movies"} indexed · Famous dialogues and iconic scenes
          </p>
        </div>

        {/* Search within director's movies */}
        <div className="mb-6">
          <SearchBox defaultValue={`${directorName} `} />
        </div>

        {/* Movies grid */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Filmography
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {movies.map((movie) => {
            const movieSlug =
              movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
              "-" +
              movie.year;
            return (
              <Link
                key={movie.id}
                href={`/movie/${movieSlug}`}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-[#E63946] transition-all group"
              >
                <div className="relative aspect-video bg-[#2A2A2A]">
                  <Image
                    src={getYouTubeThumbnail(movie.youtube_video_id)}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-white group-hover:text-[#E63946] transition-colors line-clamp-1">
                    {movie.title}
                  </p>
                  <p className="text-xs text-gray-500">{movie.year}</p>
                  {movie.actors && movie.actors.length > 0 && (
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                      {(movie.actors as string[]).slice(0, 2).join(", ")}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {movies.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No movies indexed yet for {directorName}. Check back soon!
          </p>
        )}
      </div>
    </main>
  );
}
