-- Migration: Add canonical slug column to vasanam_movies
-- Run this AFTER the initial data has been ingested.
--
-- The slug column is a generated (stored) column that creates a URL-friendly
-- slug from the movie title and year. Example: "Baasha" (1995) → "baasha-1995"
--
-- This replaces the fragile ILIKE title matching in the /movie/[slug] page
-- with an exact slug lookup.

-- Add the slug column (generated from title + year)
ALTER TABLE vasanam_movies
ADD COLUMN IF NOT EXISTS slug TEXT GENERATED ALWAYS AS (
  lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || year::text
) STORED;

-- Create unique index for fast slug lookups
CREATE UNIQUE INDEX IF NOT EXISTS vasanam_movies_slug_idx ON vasanam_movies(slug);

-- Verify: check the first few slugs
-- SELECT title, year, slug FROM vasanam_movies LIMIT 10;
