import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { checkRateLimit } from "@/lib/rate-limit";

// Node.js runtime (NOT edge) — required for in-memory rate limiter to persist
// across requests on the same warm instance. Edge isolates get fresh memory per
// request, completely bypassing the Map-based rate limit.

export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";

  if (!checkRateLimit(`api:${ip}`)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!query.trim()) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("search_dialogues", {
    search_query: query,
    result_limit: limit,
    result_offset: offset,
  });

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({
    results: data || [],
    query,
  });
}
