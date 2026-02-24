import Link from "next/link";
import Image from "next/image";
import type { SearchResult } from "@/lib/supabase";
import { formatTimestamp, getYouTubeThumbnail } from "@/lib/search";

interface Props {
  results: SearchResult[];
}

export default function SearchResults({ results }: Props) {
  if (!results.length) return null;

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <Link
          key={result.segment_id}
          href={`/d/${result.segment_id}`}
          className="block bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#E63946] transition-all group"
        >
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-28 h-16 md:w-36 md:h-20 rounded-lg overflow-hidden bg-[#2A2A2A]">
              <Image
                src={getYouTubeThumbnail(result.youtube_video_id)}
                alt={`${result.movie_title} scene`}
                fill
                className="object-cover"
                sizes="144px"
              />
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#E63946]/90 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {/* Timestamp badge */}
              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {formatTimestamp(result.start_ms)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium leading-snug mb-2 line-clamp-2 group-hover:text-[#E63946] transition-colors">
                &ldquo;{result.text}&rdquo;
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="truncate">{result.movie_title}</span>
                <span>·</span>
                <span className="flex-shrink-0">{result.movie_year}</span>
                {result.language && result.language !== "unknown" && (
                  <>
                    <span>·</span>
                    <span className="flex-shrink-0 capitalize text-xs bg-[#2A2A2A] px-1.5 py-0.5 rounded">
                      {result.language}
                    </span>
                  </>
                )}
              </div>
              {result.actors && result.actors.length > 0 && (
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {result.actors.slice(0, 3).join(", ")}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
