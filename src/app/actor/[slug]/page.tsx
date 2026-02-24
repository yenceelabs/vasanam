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

const ACTOR_DISPLAY_NAMES: Record<string, string> = {
  "rajinikanth": "Rajinikanth",
  "kamal-haasan": "Kamal Haasan",
  "vijay": "Vijay",
  "ajith-kumar": "Ajith Kumar",
  "vadivelu": "Vadivelu",
  "vikram": "Vikram",
  "suriya": "Suriya",
  "dhanush": "Dhanush",
  "sivakarthikeyan": "Sivakarthikeyan",
  "santhanam": "Santhanam",
};

async function getActorMovies(actorSlug: string) {
  const actorName = ACTOR_DISPLAY_NAMES[actorSlug];
  if (!actorName) return null;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("vasanam_movies")
    .select("id, title, title_tamil, year, youtube_video_id, poster_url, director")
    .contains("actors", [actorName])
    .order("year", { ascending: false });

  return { actorName, movies: data || [] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getActorMovies(slug);
  if (!result) return { title: "Actor not found" };

  const { actorName, movies } = result;
  return {
    title: `${actorName} Dialogues — Famous lines and scenes`,
    description: `Search all ${actorName} dialogues from ${movies.length} movies. Find famous lines, watch exact YouTube scenes. Best ${actorName} dialogues on Vasanam.`,
    openGraph: {
      title: `${actorName} Dialogues`,
      description: `Find any ${actorName} dialogue and watch the exact scene`,
    },
  };
}

export default async function ActorPage({ params }: Props) {
  const { slug } = await params;
  const result = await getActorMovies(slug);
  if (!result) notFound();

  const { actorName, movies } = result;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: actorName,
    jobTitle: "Actor",
    nationality: "Indian",
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
          <span className="text-gray-400">{actorName}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {actorName} Dialogues
          </h1>
          <p className="text-gray-400">
            {movies.length} movies indexed · Famous lines and iconic scenes
          </p>
        </div>

        {/* Search within actor */}
        <div className="mb-6">
          <SearchBox defaultValue={`${actorName} `} />
        </div>

        {/* Movies grid */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Movies
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {movies.map((movie) => {
            const movieSlug = movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + movie.year;
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
                </div>
              </Link>
            );
          })}
        </div>

        {movies.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No movies indexed yet for {actorName}. Check back soon!
          </p>
        )}
      </div>
    </main>
  );
}
