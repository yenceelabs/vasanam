import { getSupabase, SearchResult } from "./supabase";

export async function searchDialogues(
  query: string,
  limit = 20,
  offset = 0
): Promise<{ results: SearchResult[]; total: number }> {
  if (!query.trim()) return { results: [], total: 0 };

  // Postgres full-text search across Tamil + Tanglish + English segments
  // Uses simple dictionary (language-agnostic) for Tamil/Tanglish support
  const { data, error, count } = await getSupabase().rpc("search_dialogues", {
    search_query: query.trim(),
    result_limit: limit,
    result_offset: offset,
  });

  if (error) {
    console.error("Search error:", error instanceof Error ? error.message : String(error));
    return { results: [], total: 0 };
  }

  return {
    results: (data as SearchResult[]) || [],
    total: count || 0,
  };
}

export function getYouTubeEmbedUrl(
  videoId: string,
  startMs: number
): string {
  const startSeconds = Math.floor(startMs / 1000);
  return `https://www.youtube.com/embed/${videoId}?start=${startSeconds}&autoplay=1&rel=0`;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function getSceneShareUrl(segmentId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://vasanam.in";
  return `${baseUrl}/d/${segmentId}`;
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getWhatsAppShareText(
  dialogue: string,
  movieTitle: string,
  year: number,
  shareUrl: string
): string {
  return `🎬 *${movieTitle} (${year})*\n\n"${dialogue}"\n\nWatch the scene → ${shareUrl}`;
}
