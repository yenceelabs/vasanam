import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import {
  getYouTubeEmbedUrl,
  formatTimestamp,
  getWhatsAppShareText,
  getSceneShareUrl,
} from "@/lib/search";
import Link from "next/link";
import ShareButtons from "@/components/ShareButtons";
import SearchBox from "@/components/SearchBox";

interface Props {
  params: Promise<{ id: string }>;
}

async function getScene(id: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("vasanam_segments")
    .select(`
      *,
      movie:vasanam_movies(*)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

async function getMoreFromMovie(movieId: string, excludeId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("vasanam_segments")
    .select("id, text, start_ms, movie:vasanam_movies(youtube_video_id)")
    .eq("movie_id", movieId)
    .neq("id", excludeId)
    .limit(5);

  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const scene = await getScene(id);
  if (!scene) return { title: "Scene not found" };

  const movie = scene.movie as { title: string; year: number; youtube_video_id: string; poster_url: string | null } | null;
  const title = `"${scene.text.slice(0, 60)}${scene.text.length > 60 ? "..." : ""}" — ${movie?.title || ""}`;
  const description = `Watch this scene from ${movie?.title} (${movie?.year}) at ${formatTimestamp(scene.start_ms)} on YouTube. Find Tamil movie dialogues instantly on Vasanam.`;
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vasanam.vercel.app";
  const ogImage = `${BASE_URL}/api/og/scene/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ScenePage({ params }: Props) {
  const { id } = await params;
  const scene = await getScene(id);
  if (!scene) notFound();

  const movie = scene.movie as { id: string; title: string; title_tamil: string | null; year: number; youtube_video_id: string; actors: string[]; director: string | null; poster_url: string | null };
  const moreFromMovie = await getMoreFromMovie(movie.id, id);
  const shareUrl = getSceneShareUrl(id);
  const embedUrl = getYouTubeEmbedUrl(movie.youtube_video_id, scene.start_ms);

  const movieSlug = movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + movie.year;
  const whatsappText = getWhatsAppShareText(scene.text, movie.title, movie.year, shareUrl);

  return (
    <main className="min-h-screen">
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
        <nav className="text-sm text-gray-600 mb-4 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-400">Home</Link>
          <span>›</span>
          <Link href={`/movie/${movieSlug}`} className="hover:text-gray-400">
            {movie.title}
          </Link>
          <span>›</span>
          <span className="text-gray-400 truncate">{formatTimestamp(scene.start_ms)}</span>
        </nav>

        {/* Dialogue quote */}
        <blockquote className="text-xl md:text-2xl font-medium text-white mb-6 leading-relaxed border-l-4 border-[#E63946] pl-4">
          &ldquo;{scene.text}&rdquo;
        </blockquote>

        {/* Movie info */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <Link
              href={`/movie/${movieSlug}`}
              className="font-semibold text-white hover:text-[#E63946] transition-colors"
            >
              {movie.title}
            </Link>
            {movie.title_tamil && (
              <span className="text-gray-500 ml-2 tamil-text">{movie.title_tamil}</span>
            )}
            <p className="text-sm text-gray-500">
              {movie.year}
              {movie.director && ` · ${movie.director}`}
            </p>
          </div>
        </div>

        {/* YouTube embed */}
        <div className="relative pb-[56.25%] bg-black rounded-xl overflow-hidden mb-6">
          <iframe
            src={embedUrl}
            title={`${movie.title} — ${scene.text.slice(0, 50)}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Share */}
        <ShareButtons
          shareUrl={shareUrl}
          whatsappText={whatsappText}
          dialogue={scene.text}
          movieTitle={movie.title}
          year={movie.year}
        />

        {/* Timestamp info */}
        <p className="text-xs text-gray-600 mt-4 mb-8">
          Scene starts at {formatTimestamp(scene.start_ms)} in the original video
        </p>

        {/* More from this movie */}
        {moreFromMovie.length > 0 && (
          <div className="border-t border-[#1A1A1A] pt-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              More from {movie.title}
            </h2>
            <div className="space-y-2">
              {moreFromMovie.map((seg: { id: string; text: string; start_ms: number; movie: unknown }) => (
                <Link
                  key={seg.id}
                  href={`/d/${seg.id}`}
                  className="block bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3 hover:border-[#E63946] transition-colors group"
                >
                  <p className="text-sm text-gray-300 group-hover:text-white transition-colors line-clamp-1">
                    &ldquo;{seg.text}&rdquo;
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{formatTimestamp(seg.start_ms)}</p>
                </Link>
              ))}
            </div>
            <Link
              href={`/movie/${movieSlug}`}
              className="block text-center mt-4 text-sm text-[#E63946] hover:text-[#FF6B6B] transition-colors"
            >
              View all dialogues from {movie.title} →
            </Link>
          </div>
        )}

        {/* Actor links */}
        {movie.actors && movie.actors.length > 0 && (
          <div className="border-t border-[#1A1A1A] pt-6 mt-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Cast
            </h2>
            <div className="flex flex-wrap gap-2">
              {movie.actors.map((actor: string) => {
                const actorSlug = actor.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <Link
                    key={actor}
                    href={`/actor/${actorSlug}`}
                    className="px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-sm text-gray-400 hover:text-white hover:border-[#E63946] transition-colors"
                  >
                    {actor}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
