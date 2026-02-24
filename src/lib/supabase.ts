import { createClient, SupabaseClient } from "@supabase/supabase-js";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

// Lazy singleton — only initializes when first accessed at runtime
let _anonClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_anonClient) {
    _anonClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }
  return _anonClient;
}

// Server-side client with service role (for admin operations like search, sitemap)
export function createServiceClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_KEY")
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
