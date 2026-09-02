"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { DragDropUpload } from "@/components/DragDropUpload";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Studio } from "@/components/Studio";
import { AdBanner, AdInterstitial } from "@/components/Ads";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";
import { TutorialVideoModal } from "@/components/TutorialVideoModal";

export default function Home() {
  const {
    videoFile,
    hasApiKey,
    status,
    progress,
    wordsSoFar,
    transcription,
    transcribe,
    openDemoStudio,
    error,
    statusMessage,
    proxyStatus,
    proxyProgress,
  } = useApp();

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Auto-open tutorial video modal if API key is not connected
  useEffect(() => {
    const saved = localStorage.getItem("sc_api_key");
    if (!saved) {
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const busy = status === "transcribing" || status === "exporting";
  const canGenerate = Boolean(videoFile && hasApiKey) && !busy;

  const studioRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (status === "ready" && studioRef.current) {
      studioRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const showEditor = (status === "ready" || status === "exporting") && Boolean(transcription);

  // Lock body scroll when in studio editor mode to ensure zero scrolling
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
    <div
      className="flex min-h-screen flex-col bg-[#0A0A0C] text-white selection:bg-[#2997FF]/30"
      style={showEditor ? { overflow: "hidden", height: "100vh" } : undefined}
    >
      <Header />



      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />

      {/* Ad Interstitial Overlay during caption generation */}
      <AdInterstitial
        open={status === "transcribing"}
        title={proxyStatus === "generating" && progress >= 0.95 ? "Optimizing Preview Engine..." : "Generating captions..."}
        progress={proxyStatus === "generating" && progress >= 0.95 ? proxyProgress : progress}
        words={wordsSoFar}
        hideProgressPercent={false}
        adType="transcribing"
      />

      {/* Ad Interstitial Overlay during video export */}
      <AdInterstitial
        open={status === "exporting"}
        title={statusMessage || "Rendering video..."}
        progress={progress}
        adType="exporting"
      />

      <main className="flex-1 overflow-y-auto flex flex-col">
        {!showEditor ? (
          /* Landing / Upload View */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-xl space-y-5 px-6 py-8"
          >
            <div className="text-center">
              <h1 className="text-[22px] sm:text-[26px] font-medium tracking-tight text-white/90">
                Unlimited high quality captions
              </h1>
              <p className="mt-1 text-[13px] text-white/40">
                Free, watermark-free 1080p auto-captions.
              </p>
            </div>

            {/* Single Clean Main Card */}
            <div className="relative z-30 flex flex-col gap-4 rounded-2xl bg-[#141416] p-5 shadow-xl">
              <DragDropUpload />

              <LanguageSelector />

              <button
                onClick={transcribe}
                disabled={!canGenerate}
                className="w-full rounded-xl py-3 text-[14px] font-medium text-white transition-all disabled:opacity-30"
                style={{
                  background: canGenerate
                    ? "linear-gradient(135deg, #2997FF 0%, #0066CC 100%)"
                    : "rgba(255,255,255,0.06)",
                }}
              >
                {busy ? "Transcribing…" : "Generate Captions"}
              </button>

              {!hasApiKey && (
                <p className="text-center text-[12px] text-white/40">
                  Add your Gemini API key in top right to begin
                </p>
              )}
            </div>





            {error && (
              <div className="rounded-xl border border-[#FF453A]/20 bg-[#FF453A]/10 p-3 text-[13px] text-[#FF453A]">
                {error}
              </div>
            )}

            {/* Homepage Ad Banner */}
            <div className="pt-1">
              <AdBanner variant="footer" label="Homepage Banner" />
            </div>
          </motion.div>
        ) : (
          /* Studio View */
          <motion.div
            ref={studioRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <Studio />
          </motion.div>
        )}
      </main>

      <TutorialVideoModal
        open={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
