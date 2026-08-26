import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://snipcaptions.in",
  ),
  applicationName: "SnipCaptions",
  title: {
    default: "SnipCaptions — Free Auto Captions for Short-Form Video",
    template: "%s — SnipCaptions",
  },
  description:
    "Free, watermark-free 1080p auto-captions for Reels, YouTube Shorts and TikTok. Client-side processing with your own Gemini API key. Neon, Kinetic, Clean & Word-by-Word caption themes.",
  keywords: [
    "auto captions",
    "video captions",
    "reels captions",
    "youtube shorts captions",
    "tiktok captions",
    "gemini transcription",
    "no watermark",
    "1080p export",
    "client side video processing",
  ],
  authors: [{ name: "SnipCaptions" }],
  category: "technology",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "SnipCaptions",
    title: "SnipCaptions — Free Auto Captions for Short-Form Video",
    description:
      "Free, watermark-free 1080p auto-captions. Client-side processing with your own Gemini API key.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnipCaptions — Free Auto Captions for Short-Form Video",
    description:
      "Free, watermark-free 1080p auto-captions. Client-side processing with your own Gemini API key.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1e" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=Outfit:wght@400;500;600;700;800;900&family=Playfair+Display:wght@400;600;700;800;900&family=Bebas+Neue&family=Poppins:wght@400;500;600;700;800&family=Anton&family=Archivo+Black&family=Dancing+Script:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-ui antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
