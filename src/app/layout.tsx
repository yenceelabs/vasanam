import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Vasanam — Search Tamil Movie Dialogues",
    template: "%s | Vasanam",
  },
  description:
    "Search any Tamil movie dialogue and watch the exact scene on YouTube. Find famous Rajinikanth, Kamal Haasan, Vijay dialogues instantly.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://vasanam.in"),
  openGraph: {
    siteName: "Vasanam",
    type: "website",
    locale: "ta_IN",
  },
  twitter: {
    card: "summary_large_image",
    site: "@vasanamapp",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ta">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} antialiased bg-[#0F0F0F] text-white`}>
        {children}
      </body>
    </html>
  );
}
