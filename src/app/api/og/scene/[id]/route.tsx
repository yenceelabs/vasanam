import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

async function getSceneData(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("vasanam_segments")
    .select(
      `
      id, text, start_ms,
      movie:vasanam_movies(title, year, youtube_video_id, poster_url)
    `
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scene = await getSceneData(id);

  if (!scene) {
    // Fallback: generic Vasanam OG image
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(135deg, #0F0F0F 0%, #1a1a2e 50%, #16213e 100%)",
            padding: "60px",
          }}
        >
          <div style={{ fontSize: 80, fontWeight: 700, color: "#FFFFFF" }}>
            வசனம்
          </div>
          <div
            style={{ fontSize: 36, color: "#9CA3AF", marginTop: "20px" }}
          >
            Scene not found
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // Supabase foreign key join may return object or array
  const movieRaw = scene.movie;
  const movie = (Array.isArray(movieRaw) ? movieRaw[0] : movieRaw) as {
    title: string;
    year: number;
    youtube_video_id: string;
    poster_url: string | null;
  } | null;

  const dialogueText = truncateText(scene.text, 120);
  const movieTitle = movie ? `${movie.title} (${movie.year})` : "Unknown Movie";
  const timestamp = formatTimestamp(scene.start_ms);
  const thumbnailUrl = movie
    ? `https://img.youtube.com/vi/${movie.youtube_video_id}/hqdefault.jpg`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Background: YouTube thumbnail or dark gradient */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(2px) brightness(0.3)",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(135deg, #0F0F0F 0%, #1a1a2e 50%, #16213e 100%)",
            }}
          />
        )}

        {/* Dark overlay gradient from bottom */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.9) 100%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "48px 60px",
            position: "relative",
          }}
        >
          {/* Top: Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#FFFFFF",
                opacity: 0.9,
              }}
            >
              வசனம்
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#9CA3AF",
                marginLeft: "8px",
              }}
            >
              Tamil Movie Dialogues
            </div>
          </div>

          {/* Center: Dialogue text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            {/* Red accent bar */}
            <div
              style={{
                width: "60px",
                height: "4px",
                background: "#E63946",
                borderRadius: "2px",
              }}
            />
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.3,
                maxWidth: "900px",
              }}
            >
              &ldquo;{dialogueText}&rdquo;
            </div>
          </div>

          {/* Bottom: Movie info + timestamp */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#D1D5DB",
                }}
              >
                {movieTitle}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(230, 57, 70, 0.2)",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(230, 57, 70, 0.3)",
              }}
            >
              <div style={{ fontSize: 18, color: "#E63946" }}>▶</div>
              <div
                style={{
                  fontSize: 18,
                  color: "#E63946",
                  fontWeight: 600,
                }}
              >
                {timestamp}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
