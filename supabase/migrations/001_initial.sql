-- Vasanam: Tamil movie dialogue search
-- Migration 001: Initial schema

-- Movies table
CREATE TABLE IF NOT EXISTS vasanam_movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_tamil TEXT,
  year INT NOT NULL,
  youtube_video_id TEXT UNIQUE NOT NULL,
  channel_id TEXT,
  duration_ms INT,
  poster_url TEXT,
  actors TEXT[] DEFAULT '{}',
  director TEXT,
  genre TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcript segments
CREATE TABLE IF NOT EXISTS vasanam_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID REFERENCES vasanam_movies(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  start_ms INT NOT NULL,
  duration_ms INT NOT NULL DEFAULT 3000,
  language TEXT DEFAULT 'unknown', -- 'tamil', 'tanglish', 'english', 'unknown'
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', text)) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vasanam_segments_search ON vasanam_segments USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_vasanam_segments_movie ON vasanam_segments(movie_id);
CREATE INDEX IF NOT EXISTS idx_vasanam_movies_year ON vasanam_movies(year);
CREATE INDEX IF NOT EXISTS idx_vasanam_movies_actors ON vasanam_movies USING GIN(actors);

-- Search function: full-text search with movie join
CREATE OR REPLACE FUNCTION search_dialogues(
  search_query TEXT,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE (
  segment_id UUID,
  movie_id UUID,
  text TEXT,
  start_ms INT,
  duration_ms INT,
  language TEXT,
  movie_title TEXT,
  movie_year INT,
  youtube_video_id TEXT,
  poster_url TEXT,
  actors TEXT[],
  director TEXT,
  rank FLOAT4
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    s.id AS segment_id,
    s.movie_id,
    s.text,
    s.start_ms,
    s.duration_ms,
    s.language,
    m.title AS movie_title,
    m.year AS movie_year,
    m.youtube_video_id,
    m.poster_url,
    m.actors,
    m.director,
    ts_rank(s.search_vector, plainto_tsquery('simple', search_query)) AS rank
  FROM vasanam_segments s
  JOIN vasanam_movies m ON s.movie_id = m.id
  WHERE s.search_vector @@ plainto_tsquery('simple', search_query)
  ORDER BY rank DESC, s.start_ms ASC
  LIMIT result_limit
  OFFSET result_offset;
$$;

-- User favorites (for Pro tier)
CREATE TABLE IF NOT EXISTS vasanam_user_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID
  segment_id UUID REFERENCES vasanam_segments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_vasanam_saves_user ON vasanam_user_saves(user_id);

-- Users / subscriptions
CREATE TABLE IF NOT EXISTS vasanam_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  plan TEXT DEFAULT 'free', -- 'free', 'pro'
  plan_expires_at TIMESTAMPTZ,
  dodo_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vasanam_user_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE vasanam_users ENABLE ROW LEVEL SECURITY;

-- Public read on movies and segments (search is open)
ALTER TABLE vasanam_movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vasanam_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read movies" ON vasanam_movies FOR SELECT USING (true);
CREATE POLICY "Public read segments" ON vasanam_segments FOR SELECT USING (true);
CREATE POLICY "Service role full access movies" ON vasanam_movies USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access segments" ON vasanam_segments USING (auth.role() = 'service_role');
