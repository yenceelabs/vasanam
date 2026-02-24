import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "வசனம்").slice(0, 100);
  const subtitle = (
    searchParams.get("subtitle") || "Search Tamil Movie Dialogues"
  ).slice(0, 150);

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
          background: "linear-gradient(135deg, #0F0F0F 0%, #1a1a2e 50%, #16213e 100%)",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {/* Logo text */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-2px",
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 36,
              color: "#9CA3AF",
              maxWidth: "800px",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>

          {/* Tagline bar */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            {["🎬 Type a dialogue", "🎯 Find the scene", "▶️ Watch on YouTube"].map(
              (text) => (
                <div
                  key={text}
                  style={{
                    fontSize: 22,
                    color: "#D1D5DB",
                    background: "rgba(255,255,255,0.08)",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {text}
                </div>
              )
            )}
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
