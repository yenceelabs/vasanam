import { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vasanam.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  // Get all movies
  const { data: movies } = await supabase
    .from("vasanam_movies")
    .select("title, year, created_at")
    .order("year", { ascending: false });

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
