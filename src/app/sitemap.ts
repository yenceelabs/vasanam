import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vasanam.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let movies: Array<{ title: string; year: number; created_at: string }> | null = null;

  // Only query Supabase if env vars are available (skips during build without env)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      const { createServiceClient } = await import("@/lib/supabase");
      const supabase = createServiceClient();
      const result = await supabase
        .from("vasanam_movies")
        .select("title, year, created_at")
        .order("year", { ascending: false });
      movies = result.data;
    } catch {
      // Supabase not available at build time — skip dynamic entries
    }
  }

  const movieUrls: MetadataRoute.Sitemap = (movies || []).map((movie) => ({
    url: `${BASE_URL}/movie/${movie.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${movie.year}`,
    lastModified: movie.created_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // Static actor pages
  const actors = [
    "rajinikanth", "kamal-haasan", "vijay", "ajith-kumar",
    "vadivelu", "vikram", "suriya", "dhanush", "sivakarthikeyan",
  ];

  const actorUrls: MetadataRoute.Sitemap = actors.map((slug) => ({
    url: `${BASE_URL}/actor/${slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...movieUrls,
    ...actorUrls,
  ];
}
