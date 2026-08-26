"use client";

import { useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { DragDropUpload } from "@/components/DragDropUpload";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Studio } from "@/components/Studio";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";

export default function Home() {
  const {
    videoFile,
    hasApiKey,
    status,
    progress,
    wordsSoFar,
    transcription,
    transcribe,
    error,
  } = useApp();

  const busy = status === "transcribing" || status === "exporting";
  const canGenerate = Boolean(videoFile && hasApiKey) && !busy;

  const studioRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (status === "ready" && studioRef.current) {
      studioRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const showEditor = status === "ready" && transcription;

  // Lock body scroll when in editor mode
  useEffect(() => {
    if (showEditor) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [showEditor]);

  const homeJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SnipCaptions",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free, watermark-free 1080p auto-captions for short-form video. Client-side processing with your own Gemini API key.",
    url: "https://snipcaptions.in",
  };

  return (
    <div className="flex min-h-screen flex-col bg-black" style={showEditor ? { overflow: "hidden", height: "100vh" } : undefined}>
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

      {/* Transcription overlay */}
      {status === "transcribing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex w-[360px] flex-col items-center gap-5 rounded-3xl border border-white/[0.06] bg-[#1C1C1E] p-8"
          >
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "#2997FF",
                  animation: "spin 1s linear infinite",
                }}
              />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2997FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>

            <div className="w-full text-center">
              <p className="text-[15px] font-medium text-white">Generating captions</p>
              <p className="mt-1 text-[13px] text-white/40">
                {wordsSoFar} words transcribed
              </p>
            </div>

            <div className="w-full">
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-[#2997FF]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-white/30">
                {Math.round(progress * 100)}%
              </p>
            </div>
          </motion.div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <main className="mx-auto w-full flex-1 px-6 py-8 sm:px-10 lg:px-16">
        {!showEditor ? (
          /* Landing / Upload View */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-xl space-y-6 pt-8"
          >
            <div className="text-center">
              <h1 className="text-[32px] font-semibold tracking-tight text-white sm:text-[40px]">
                Unlimited high quality captions 
              </h1>
              <p className="mt-2 text-[15px] text-white/40">
                Free. No watermark. 1080p export.
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
              <DragDropUpload />
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5">
              <LanguageSelector />

              <button
                onClick={transcribe}
                disabled={!canGenerate}
                className="w-full rounded-2xl py-3 text-[15px] font-medium text-white transition-all duration-200 disabled:opacity-30"
                style={{
                  background: canGenerate
                    ? "linear-gradient(135deg, #2997FF, #0066CC)"
                    : "rgba(255,255,255,0.06)",
                }}
              >
                {busy ? "Transcribing…" : "Generate Captions"}
              </button>

              {!hasApiKey && (
                <p className="text-center text-[12px] text-white/30">
                  Add your Gemini API key to begin
                </p>
              )}
              {!videoFile && (
                <p className="text-center text-[12px] text-white/30">
                  Upload a video to get started
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-2xl border border-[#FF453A]/20 bg-[#FF453A]/5 px-4 py-3 text-[13px] text-[#FF453A]">
                {error}
              </div>
            )}
          </motion.div>
        ) : (
          /* Editor View */
          <motion.div
            ref={studioRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Studio />
          </motion.div>
        )}
      </main>
    </div>
  );
}
