import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role (for admin operations)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// Database types
export interface Movie {
  id: string;
  title: string;
  title_tamil: string | null;
  year: number;
  youtube_video_id: string;
  channel_id: string | null;
  duration_ms: number | null;
  poster_url: string | null;
  actors: string[];
  director: string | null;
  genre: string[];
  created_at: string;
}

export interface Segment {
  id: string;
  movie_id: string;
  text: string;
  start_ms: number;
  duration_ms: number;
  language: string;
  created_at: string;
  // Joined
  movie?: Movie;
}

export interface SearchResult {
  segment_id: string;
  movie_id: string;
  text: string;
  start_ms: number;
  duration_ms: number;
  language: string;
  movie_title: string;
  movie_year: number;
  youtube_video_id: string;
  poster_url: string | null;
  actors: string[];
  director: string | null;
  rank: number;
}
