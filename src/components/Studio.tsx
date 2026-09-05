"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { PixiPlayer, PixiPlayerRef } from "./PixiPlayer";
import { useApp } from "@/lib/store";
import { CAPTION_THEMES } from "@/lib/types";
import { ExportResolutionModal, ExportPreset } from "./ExportResolutionModal";
import { exportVideoWithWebCodecs } from "@/lib/exportEngine";

const FPS = 30; // 30 FPS Lock

const PRESET_COLORS = [
  "#ffffff",
  "#00e5ff",
  "#f97316",
  "#ffd60a",
  "#ff3b30",
  "#30d158",
  "#af52de",
];

const FONTS = [
  { name: "SF Pro Display", value: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif', desc: "Clean & Apple" },
  { name: "Gilroy ExtraBold", value: '"Gilroy", sans-serif', desc: "Modern & Punchy" },
  { name: "Helvetica Rounded", value: '"Helvetica Rounded", sans-serif', desc: "Soft & Comic" },
  { name: "Helvetica Bold", value: '"Helvetica Bold", sans-serif', desc: "Impact & Glow" },
  { name: "Readex Pro", value: '"Readex Pro", sans-serif', desc: "Clean & Rounded" },
  { name: "Celosia Nature", value: '"Celosia Nature", sans-serif', desc: "Elegant script" },
  { name: "Longmile", value: '"Longmile", sans-serif', desc: "Bold Display" },
  { name: "NCL Gasdrifo", value: '"NCL Gasdrifo", sans-serif', desc: "Distorted Creative" },
  { name: "Retro Floral", value: '"Retro Floral", sans-serif', desc: "Decorative Retro" },
  { name: "Qurova Light", value: '"Qurova Light", sans-serif', desc: "Premium Light serif" },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className={`shrink-0 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#2997FF]">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FontDropdown({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = FONTS.find((f) => f.value === value) ?? FONTS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-[15px] text-white" style={{ fontFamily: selected.value }}>
            {selected.name}
          </span>
          <span className="truncate text-[11px] text-white/40">{selected.desc}</span>
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 origin-top overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/90 shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <div className="max-h-64 overflow-y-auto p-1.5">
            {FONTS.map((f) => {
              const active = f.value === value;
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => {
                    onChange(f.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    active ? "bg-[#2997FF]/15" : "hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={`truncate text-[15px] leading-tight ${active ? "text-white" : "text-white/90"}`}
                      style={{ fontFamily: f.value }}
                    >
                      {f.name}
                    </span>
                    <span className="truncate text-[10px] text-white/40">{f.desc}</span>
                  </span>
                  {active && <CheckIcon />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Animated Preview Widget ──────────────────────────────────────────────────
// Cycles through demo steps at 560 ms intervals so template cards feel live.
// 6 steps: 0–5 so dual_line_glow can reveal 5 words + bottom row
const PREVIEW_STEPS = 6;

function AnimatedPreview({ themeId, themeAccent }: { themeId: string; themeAccent: string }) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % 4), 560);
    return () => clearInterval(id);
  }, []);

  const accent = themeAccent;

  switch (themeId) {
    case "liquid_glass": {
      const words = ["the", "quick", "brown", "fox"];
      return (
        <div
          className="text-[11px] font-medium transition-all duration-300"
          style={{
            background: "rgba(255, 255, 255, 0.12)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            borderRadius: "20px",
            padding: "5px 14px",
            display: "inline-flex",
            gap: "6px",
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {words.map((w, idx) => {
            const isSpoken = activeIdx === idx;
            return (
              <span
                key={w}
                className="transition-all duration-200"
                style={{
                  color: isSpoken ? accent : "#FFFFFF",
                  fontWeight: isSpoken ? "800" : "500",
                  opacity: isSpoken ? 1 : 0.5,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      );
    }

    case "minimal_blur_blend": {
      return (
        <div className="text-center leading-none space-y-0.5">
          <div className="text-[9px] text-white/60 font-medium" style={{ fontFamily: '"Celosia Nature", cursive' }}>
            the quick
          </div>
          <div
            className="text-[16px] font-black uppercase tracking-tight transition-all duration-300"
            style={{
              fontFamily: '"Helvetica Bold", sans-serif',
              color: accent,
              textShadow: `0 0 12px ${accent}aa`,
              filter: activeIdx === 1 ? "blur(0px)" : "blur(3px)",
              opacity: activeIdx === 1 ? 1 : 0.4,
              transform: activeIdx === 1 ? "scale(1.05)" : "scale(0.95)",
            }}
          >
            BROWN
          </div>
          <div
            className="text-[8px] text-white/60 font-medium transition-all duration-300"
            style={{
              fontFamily: '"Celosia Nature", cursive',
              opacity: activeIdx >= 2 ? 1 : 0.3,
              transform: activeIdx >= 2 ? "translateY(0)" : "translateY(3px)",
            }}
          >
            fox jumps
          </div>
        </div>
      );
    }

    case "minimal_blend": {
      return (
        <div className="text-center leading-none space-y-0.5">
          <div className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">the quick</div>
          <div
            className="text-[17px] font-black uppercase text-white tracking-tighter transition-all duration-300"
            style={{
              transform: activeIdx === 1 ? "translateY(0)" : "translateY(4px)",
              opacity: activeIdx === 1 ? 1 : 0.5,
            }}
          >
            BROWN
          </div>
          <div className="text-[9px] text-white/50 font-medium uppercase tracking-wider">fox jumps</div>
        </div>
      );
    }

    case "premiere_glow": {
      return (
        <div className="text-center leading-none space-y-0.5">
          <div className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">the quick</div>
          <div
            className="text-[17px] font-black uppercase tracking-tighter transition-all duration-300"
            style={{
              color: accent,
              textShadow: `0 0 16px ${accent}, 0 0 30px ${accent}aa`,
              transform: activeIdx === 1 ? "scale(1.08)" : "scale(0.96)",
              opacity: activeIdx === 1 ? 1 : 0.6,
            }}
          >
            BROWN
          </div>
          <div className="text-[9px] text-white/50 font-medium uppercase tracking-wider">fox jumps</div>
        </div>
      );
    }

    case "dual_line_glow": {
      const topWords = ["EK", "CHEEZ", "SHURU", "SE"];
      const botWords = ["Ab Tak", "Samjhata"];
      return (
        <div className="text-center leading-none space-y-1 px-1 w-full">
          <div className="flex gap-[3px] justify-center flex-wrap">
            {topWords.map((w, i) => (
              <span
                key={w}
                className="text-[10px] font-black uppercase transition-all duration-200"
                style={{
                  fontFamily: '"NCL Gasdrifo", "Gilroy", sans-serif',
                  opacity: activeIdx >= i ? 1 : 0.3,
                  color: activeIdx === i ? accent : "#ffffff",
                  textShadow: activeIdx === i ? `0 0 10px ${accent}` : "none",
                }}
              >
                {w}
              </span>
            ))}
          </div>
          <div className="flex gap-[4px] justify-center flex-wrap">
            {botWords.map((w, i) => (
              <span
                key={w}
                className="text-[8px] font-medium transition-all duration-300"
                style={{
                  fontFamily: "cursive",
                  color: "rgba(255,255,255,0.8)",
                  opacity: activeIdx >= 2 ? 1 : 0.2,
                  transform: activeIdx >= 2 ? "translateY(0)" : "translateY(4px)",
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case "snipcap_special": {
      return (
        <div className="text-center leading-none">
          <div
            className="text-[9px] lowercase transition-all duration-300"
            style={{
              fontFamily: "cursive",
              color: activeIdx === 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
            }}
          >
            ha to aapne
          </div>
          <div
            className="text-[15px] font-black uppercase my-0.5 transition-all duration-300"
            style={{
              color: accent,
              textShadow: `0 0 10px ${accent}`,
              filter: activeIdx === 1 ? "blur(0px)" : "blur(2px)",
              opacity: activeIdx === 1 ? 1 : 0.4,
              transform: activeIdx === 1 ? "scale(1.08)" : "scale(0.9)",
            }}
          >
            ELON
          </div>
          <div
            className="text-[8px] lowercase font-semibold tracking-wide transition-all duration-300"
            style={{
              fontFamily: "cursive",
              color: activeIdx === 2 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
            }}
          >
            kya kaha
          </div>
        </div>
      );
    }

    case "clean": {
      const words = ["the", "quick", "brown", "fox"];
      return (
        <div className="flex items-center gap-1.5 justify-center">
          {words.map((w, i) => (
            <span
              key={w}
              className="text-[13px] font-bold text-white transition-all duration-300"
              style={{
                opacity: activeIdx >= i ? 1 : 0.3,
                transform: activeIdx >= i ? "translateY(0)" : "translateY(5px)",
              }}
            >
              {w}
            </span>
          ))}
        </div>
      );
    }

    case "highlight": {
      const words = ["the", "quick", "BROWN", "fox"];
      return (
        <div className="flex items-center gap-1.5 justify-center">
          {words.map((w, i) => {
            const active = activeIdx === i;
            return (
              <span
                key={w}
                className="text-[13px] font-extrabold transition-all duration-200"
                style={{
                  color: active ? accent : "#FFFFFF",
                  transform: active ? "scale(1.15)" : "scale(1)",
                  textShadow: active ? `0 0 10px ${accent}88` : "none",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      );
    }

    case "one_word": {
      const words = ["THE", "QUICK", "BROWN", "FOX"];
      return (
        <div className="text-center font-black">
          <span
            className="text-[16px] uppercase tracking-wider transition-all duration-150"
            style={{ color: accent }}
          >
            {words[activeIdx % words.length]}
          </span>
        </div>
      );
    }

    case "neon": {
      return (
        <div className="text-center font-black">
          <span
            className="text-[14px] font-black uppercase tracking-wide transition-all duration-300"
            style={{
              color: "#FFFFFF",
              WebkitTextStroke: `1px ${accent}`,
              textShadow: `0 0 10px ${accent}, 0 0 22px ${accent}`,
            }}
          >
            THE QUICK BROWN
          </span>
        </div>
      );
    }

    case "kinetic_01": {
      return (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
          <span
            className="absolute text-[9px] font-bold"
            style={{
              fontFamily: "cursive",
              color: "rgba(255,255,255,0.55)",
              top: "10%", left: "10%",
              opacity: activeIdx >= 1 ? 1 : 0,
              transform: activeIdx >= 1 ? "translateY(0px)" : "translateY(6px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            quick
          </span>
          <span
            className="text-[18px] font-black uppercase"
            style={{
              color: accent,
              textShadow: `0 0 10px ${accent}55`,
              transform: `scale(${activeIdx === 1 ? 1.1 : 1})`,
              transition: "transform 0.3s ease",
            }}
          >
            BROWN
          </span>
          <span
            className="absolute text-[9px] font-bold"
            style={{
              fontFamily: "cursive",
              color: "rgba(255,255,255,0.55)",
              bottom: "10%", right: "10%",
              opacity: activeIdx === 2 ? 1 : 0,
              transform: activeIdx === 2 ? "translateY(0px)" : "translateY(-6px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            fox
          </span>
        </div>
      );
    }

    case "kinetic": {
      const words = ["the", "quick", "BROWN", "fox"];
      return (
        <div className="flex items-center gap-1.5 justify-center">
          {words.map((w, i) => {
            const active = activeIdx === i;
            return (
              <span
                key={w}
                className="text-[13px] font-extrabold transition-all duration-300"
                style={{
                  color: active ? accent : "#FFFFFF",
                  transform: active ? "scale(1.25) translateY(-2px)" : "scale(1) translateY(0)",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      );
    }

    case "black_punch": {
      const words = ["THE", "QUICK", "BROWN", "FOX"];
      return (
        <div className="flex items-center gap-1.5 justify-center">
          {words.map((w, i) => {
            const active = activeIdx === i;
            return (
              <span
                key={w}
                className="text-[12px] font-black uppercase transition-all duration-300 ease-out"
                style={{
                  color: active ? "#000000" : "#FFFFFF",
                  backgroundColor: active ? "#FFFFFF" : "transparent",
                  padding: active ? "3px 7px" : "0px",
                  borderRadius: active ? "5px" : "0px",
                  transform: active ? "scale(1.12)" : "scale(1)",
                  boxShadow: active ? "0 2px 10px rgba(255,255,255,0.4)" : "none",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      );
    }

    default:
      return null;
  }
}

const ANIMATED_THEMES = new Set(["kinetic_01", "snipcap_special", "dual_line_glow"]);

// Fallback dummy words for instant studio UI preview (18 words / ~9 s)
const DUMMY_WORDS = [
  { word: "the",    start: 0.10, end: 0.38 },
  { word: "quick",  start: 0.42, end: 0.75 },
  { word: "brown",  start: 0.78, end: 1.10 },
  { word: "fox",    start: 1.14, end: 1.42 },
  { word: "jumps",  start: 1.46, end: 1.80 },
  { word: "over",   start: 1.84, end: 2.12 },
  { word: "a",      start: 2.16, end: 2.32 },
  { word: "lazy",   start: 2.36, end: 2.68 },
  { word: "dog",    start: 2.72, end: 3.00 },
  { word: "and",    start: 3.04, end: 3.22 },
  { word: "then",   start: 3.26, end: 3.54 },
  { word: "runs",   start: 3.58, end: 3.86 },
  { word: "into",   start: 3.90, end: 4.16 },
  { word: "the",    start: 4.20, end: 4.38 },
  { word: "wild",   start: 4.42, end: 4.72 },
  { word: "night",  start: 4.76, end: 5.10 },
  { word: "again",  start: 5.14, end: 5.50 },
  { word: "forever",start: 5.54, end: 6.00 },
];

export function Studio() {
  const {
    videoFile,
    videoUrl,
    originalVideoUrl,
    originalWidth,
    originalHeight,
    proxyStatus,
    proxyToast,
    clearProxyToast,
    words: storeWords,
    captionTheme,
    captionPosition,
    setCaptionPosition,
    captionScale,
    setCaptionScale,
    customAccentColor,
    setCustomAccentColor,
    customFontFamily,
    setCustomFontFamily,
    durationInSeconds: storeDuration,
    progress,
    setStatus,
    setProgress,
    setStatusMessage,
    setCaptionTheme,
    updateWord,
  } = useApp();

  // Use uploaded words/duration or fallback dummy data for live preview
  const words = storeWords && storeWords.length > 0 ? storeWords : DUMMY_WORDS;
  const durationInSeconds = storeDuration > 0 ? storeDuration : 7;

  const [exporting, setExporting] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"templates" | "settings" | "transcript">("templates");
  const [showExportModal, setShowExportModal] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);

  // Auto detect mobile device
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobileDevice(isMobile);
    }
  }, []);

  // Auto clear toast notifications
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Surface proxy engine warnings as Studio toasts
  useEffect(() => {
    if (!proxyToast) return;
    setToast({ type: proxyToast.type, message: proxyToast.message });
    clearProxyToast();
  }, [proxyToast, clearProxyToast]);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PixiPlayerRef>(null);
  const padRef = useRef<HTMLDivElement | null>(null);

  const handlePadPointer = (clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;

    const rect = pad.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const pctX = Math.max(5, Math.min(95, (x / rect.width) * 100));
    const pctY = Math.max(5, Math.min(95, (y / rect.height) * 100));

    setCaptionPosition({
      x: Math.round(pctX * 10) / 10,
      y: Math.round(pctY * 10) / 10,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePadPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      handlePadPointer(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const padAspect = naturalAspect || 0.5625; // Default to 9:16 portrait
  let padWidth = 200;
  let padHeight = 200;
  if (padAspect > 1) {
    padWidth = 220;
    padHeight = Math.round(220 / padAspect);
  } else {
    padHeight = 220;
    padWidth = Math.round(220 * padAspect);
  }



  const [playerDims, setPlayerDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const accent = useMemo(
    () => customAccentColor ?? CAPTION_THEMES.find((t) => t.id === captionTheme)?.accent ?? "#ffffff",
    [captionTheme, customAccentColor],
  );

  const playerInputProps = useMemo(() => ({
    src: videoUrl || "",
    words,
    theme: captionTheme,
    accentColor: accent,
    position: captionPosition,
    scale: captionScale,
    customFontFamily,
  }), [videoUrl, words, captionTheme, accent, captionPosition, captionScale, customFontFamily]);

  const durationInFrames = Math.max(1, Math.round(durationInSeconds * FPS));
  const ready = Boolean(videoUrl) || words.length > 0;

  // Maximum source base resolution dimensions (1080p base)
  const compWidth = naturalAspect && naturalAspect > 1 ? 1920 : 1080;
  const compHeight = naturalAspect && naturalAspect > 1 ? Math.round(Math.round(1920 / naturalAspect) / 2) * 2 : 1920;

  // Render/Export dimensions must be multiples of 2 (even numbers) for H.264 WebCodecs
  const getRenderDimensions = () => {
    const w = Math.round(originalWidth / 2) * 2;
    const h = Math.round(originalHeight / 2) * 2;
    return { width: w, height: h };
  };

  const { width: renderWidth, height: renderHeight } = getRenderDimensions();

  // Dynamic preview resolution scaling for Player (Zero-Transcode Canvas Downscaling)
  // Target 720p for Desktop/PC devices, 480p for Mobile viewports, maintaining aspect ratio.
  const getAdaptivePreviewDimensions = () => {
    const isMobileDevice = typeof window !== "undefined" && (
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
    );
    const targetShort = isMobileDevice ? 480 : 720;
    const aspect = naturalAspect || (compWidth / compHeight);

    let w = 1080;
    let h = 1920;

    if (aspect > 1) {
      // Landscape: height is the target short side
      h = targetShort;
      w = Math.round((targetShort * aspect) / 2) * 2;
    } else {
      // Portrait / Square: width is the target short side
      w = targetShort;
      h = Math.round((targetShort / aspect) / 2) * 2;
    }
    return { width: w, height: h };
  };

  const { width: previewWidth, height: previewHeight } = getAdaptivePreviewDimensions();

  // Auto detect natural aspect ratio when video URL is present with iOS compatibility
  useEffect(() => {
    if (!videoUrl) return;
    const v = document.createElement("video");
    v.preload = "metadata";
    v.playsInline = true;
    v.muted = true;
    v.src = videoUrl;
    v.onloadedmetadata = () => {
      if (v.videoWidth && v.videoHeight) {
        setNaturalAspect(v.videoWidth / v.videoHeight);
      }
    };
  }, [videoUrl]);

  // Measure player container size for Fabric.js overlay
  useEffect(() => {
    const el = playerContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      setPlayerDims({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [naturalAspect]);

  const handleExport = async (preset: ExportPreset = "1080p") => {
    if (!ready) return;

    if (playerRef.current) {
      playerRef.current.pause();
    }

    setExporting(true);
    setStatus("exporting");
    setProgress(0);
    setStatusMessage("Initializing GPU encoding engine…");

    const aspect = naturalAspect || (originalWidth > 0 && originalHeight > 0 ? originalWidth / originalHeight : 9 / 16);
    const isLandscape = aspect > 1;

    let aspectW = renderWidth;
    let aspectH = renderHeight;

    if (preset !== "original") {
      const shortSide = preset === "1080p" ? 1080 : preset === "720p" ? 720 : 540;
      if (isLandscape) {
        aspectH = shortSide;
        aspectW = Math.round((shortSide * aspect) / 2) * 2;
      } else {
        aspectW = shortSide;
        aspectH = Math.round((shortSide / aspect) / 2) * 2;
      }
    }

    try {
      console.log(`[Studio:export] Starting hardware-accelerated video export (${preset} preset: ${aspectW}x${aspectH})...`);

      const exportSrc = originalVideoUrl || videoUrl || "";
      const exportFile = videoFile || new Blob([], { type: "video/mp4" });

      const finalBlob = await exportVideoWithWebCodecs({
        videoFile: exportFile,
        videoUrl: exportSrc,
        words,
        theme: captionTheme,
        accentColor: accent,
        position: captionPosition,
        scale: captionScale,
        customFontFamily,
        width: aspectW,
        height: aspectH,
        fps: 60,
        durationInSeconds,
        onProgress: (p) => {
          setProgress(p.progress);
          setStatusMessage(p.stage);
        },
      });

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snipcaptions-${captionTheme}-${Date.now()}.mp4`;
      a.target = "_self";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setProgress(1);
      setStatusMessage("Export complete!");
      setToast({
        type: "success",
        message: "Video exported in record time using GPU WebCodecs!",
      });
    } catch (e) {
      console.error("[Studio] WebCodecs export error", e);
      setStatusMessage(e instanceof Error ? e.message : "Export failed");
      setToast({
        type: "error",
        message: e instanceof Error ? e.message : "An unexpected error occurred during export.",
      });
    } finally {
      setExporting(false);
      setStatus("ready");
    }
  };

  const downloadSRT = () => {
    if (!words || words.length === 0) return;
    
    const srtLines: string[] = [];
    const maxWordsPerSrtLine = 4;
    let sequence = 1;
    
    for (let i = 0; i < words.length; i += maxWordsPerSrtLine) {
      const chunk = words.slice(i, i + maxWordsPerSrtLine);
      const start = chunk[0].start;
      const end = chunk[chunk.length - 1].end;
      const text = chunk.map(w => w.word).join(" ");
      
      const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
      };
      
      srtLines.push(`${sequence}`);
      srtLines.push(`${formatTime(start)} --> ${formatTime(end)}`);
      srtLines.push(text);
      srtLines.push("");
      sequence++;
    }
    
    const content = srtLines.join("\n");
    const blob = new Blob([content], { type: "text/srt;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subtitles.srt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[calc(100vh-108px)] w-full flex-col overflow-hidden bg-[#0A0A0C]">
      {/* banner ads area */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#121214] px-4 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white/90">
            <span className="hidden sm:inline"></span>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={downloadSRT}
            disabled={!ready || words.length === 0}
            title="Download SRT Subtitles"
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-[13px] font-semibold text-white/90 transition-all disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="hidden sm:inline">Download SRT</span>
            <span className="sm:hidden">SRT</span>
          </button>

          <button
            onClick={() => handleExport("original")}
            disabled={exporting || !ready}
            title="Export Video with Captions"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2997FF] to-[#0066CC] px-3 py-1.5 sm:px-4 sm:py-1.5 text-[13px] font-semibold text-white shadow-lg shadow-[#2997FF]/25 transition-all disabled:opacity-40"
          >
            {exporting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Exporting ({Math.round(progress * 100)}%)</span>
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span className="hidden sm:inline">Export Video</span>
                <span className="sm:hidden">Export</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio View (Remotion Player + Right Sidebar) */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left: Player Viewport */}
        <div className="flex flex-1 flex-col overflow-hidden bg-black/60 relative">
          {ready && isMobileDevice && (
            <div className="flex justify-center pt-3 px-4 z-10 shrink-0">
              <div className="flex items-center gap-2 rounded-full bg-[#FF453A]/8 px-3.5 py-1.5 text-[11px] font-semibold text-[#FF453A] shadow-lg shadow-[#FF453A]/5 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Don&apos;t worry, the final exported video will not lag!</span>
              </div>
            </div>
          )}
          <div className="flex flex-1 items-center justify-center p-3 sm:p-5 min-h-0 min-w-0">
            {ready ? (
              <PixiPlayer
                ref={playerRef}
                src={videoUrl || ""}
                words={words}
                theme={captionTheme}
                accentColor={accent}
                position={captionPosition}
                scale={captionScale}
                customFontFamily={customFontFamily}
                durationInSeconds={durationInSeconds}
                naturalAspect={naturalAspect}
                onPositionClick={() => {
                  playerRef.current?.pause();
                  setActiveTab("settings");
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-white/30">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="4" />
                  <path d="M10 8l6 4-6 4V8z" />
                </svg>
                <p className="mt-2 text-[14px]">No video loaded</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Studio Sidebar (3 Tabs: Templates, Style & Position, Transcript) */}
        <div className="w-full md:w-[320px] h-[320px] md:h-full shrink-0 border-t md:border-t-0 md:border-l border-white/[0.06] bg-[#121214] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] bg-black/20">
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex-1 py-3 text-[11px] font-semibold transition-all ${
                activeTab === "templates"
                  ? "border-b-2 border-[#2997FF] text-white bg-white/[0.02]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 py-3 text-[11px] font-semibold transition-all ${
                activeTab === "settings"
                  ? "border-b-2 border-[#2997FF] text-white bg-white/[0.02]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Style & Position
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={`flex-1 py-3 text-[11px] font-semibold transition-all ${
                activeTab === "transcript"
                  ? "border-b-2 border-[#2997FF] text-white bg-white/[0.02]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Edit Words
            </button>
          </div>

          {/* Sidebar Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Tab 1: Built-in Templates */}
            {activeTab === "templates" && (
              <div className="space-y-3">
                {CAPTION_THEMES.map((t) => {
                  const isSelected = t.id === captionTheme;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setCaptionTheme(t.id)}
                      className={`group w-full rounded-2xl p-3 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-2 border-[#2997FF] bg-[#2997FF]/[0.08] shadow-[0_0_20px_rgba(41,151,255,0.15)]"
                          : "border border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[14px] font-semibold text-white">{t.name}</span>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2997FF] text-white text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="flex h-16 w-full items-center justify-center rounded-xl bg-black/60 border border-white/[0.04] p-2 overflow-hidden">
                        <AnimatedPreview themeId={t.id} themeAccent={t.accent} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Style, Colors & Position Controls */}
            {activeTab === "settings" && (
              <div className="space-y-5">
                {/* Accent Color Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                      Accent Color
                    </label>
                    {customAccentColor && (
                      <button
                        onClick={() => setCustomAccentColor(null)}
                        className="text-[10px] font-medium text-[#2997FF] hover:underline"
                      >
                        Reset Color
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCustomAccentColor(c)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                          accent === c ? "scale-110 border-white shadow-lg" : "border-transparent opacity-80 hover:opacity-100"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                    {/* Custom Color Input */}
                    <label
                      className="h-7 w-7 rounded-full border border-white/20 flex items-center justify-center cursor-pointer overflow-hidden bg-white/[0.06] hover:bg-white/[0.12]"
                      title="Pick Custom Color"
                    >
                      <input
                        type="color"
                        value={accent}
                        onChange={(e) => setCustomAccentColor(e.target.value)}
                        className="opacity-0 w-0 h-0"
                      />
                      <span className="text-[14px] font-bold text-white/80">+</span>
                    </label>
                  </div>
                </div>
                {/* Font Selector / Font Pair Feature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                      Typography
                    </label>
                    {customFontFamily && (
                      <button
                        onClick={() => setCustomFontFamily(null)}
                        className="text-[10px] font-medium text-[#2997FF] hover:underline"
                      >
                        Reset Font
                      </button>
                    )}
                  </div>
                  <FontDropdown value={customFontFamily} onChange={setCustomFontFamily} />
                </div>

                {/* Caption Scale Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                      Caption Scale
                    </label>
                    <span className="text-[12px] font-mono text-white/80">{captionScale.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.05"
                    value={captionScale}
                    onChange={(e) => setCaptionScale(parseFloat(e.target.value))}
                    className="w-full accent-[#2997FF]"
                  />
                </div>

                {/* Inline Caption Position Pad */}
                <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                      Position Pad
                    </label>
                    <span className="text-[10px] text-white/30">Drag handle or tap pad</span>
                  </div>
                  
                  <div className="flex justify-center items-center py-3 bg-black/40 rounded-2xl border border-white/[0.04]">
                    <div
                      ref={padRef}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="relative bg-[#1a1a1e] bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:14px_14px] border border-white/10 rounded-2xl cursor-crosshair overflow-hidden touch-none select-none"
                      style={{
                        width: padWidth,
                        height: padHeight,
                      }}
                    >
                      {/* Grid lines */}
                      <div className="absolute inset-x-0 top-1/2 border-t border-white/[0.03] pointer-events-none" />
                      <div className="absolute inset-y-0 left-1/2 border-l border-white/[0.03] pointer-events-none" />

                      {/* Subtitle Representation Box */}
                      <div
                        className="absolute bg-[#2997FF] text-white text-[8px] font-extrabold px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap select-none border border-white/20 uppercase tracking-wide"
                        style={{
                          left: `${captionPosition.x}%`,
                          top: `${captionPosition.y}%`,
                          transform: `translate(-50%, -50%) scale(${Math.min(1.5, captionScale)})`,
                        }}
                      >
                        Sub
                      </div>
                    </div>
                  </div>

                  {/* Quick Align buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCaptionPosition({ x: 50, y: captionPosition.y })}
                      className="flex-1 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[10px] font-semibold text-white/70 hover:text-white transition-colors"
                    >
                      Center X
                    </button>
                    <button
                      onClick={() => setCaptionPosition({ x: captionPosition.x, y: 80 })}
                      className="flex-1 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-[10px] font-semibold text-white/70 hover:text-white transition-colors"
                    >
                      Align Bottom
                    </button>
                  </div>

                  {/* Export Resolution Selector */}
                </div>
              </div>
            )}

            {/* Tab 3: Manual Word Transcript Correction */}
            {activeTab === "transcript" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Transcribed Words :
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                  {words.map((w, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 transition-colors hover:border-white/15"
                    >
                      <span className="w-11 shrink-0 text-[10px] font-mono text-white/40">
                        {w.start.toFixed(1)}s
                      </span>
                      <input
                        type="text"
                        value={w.word}
                        onChange={(e) => updateWord(index, e.target.value)}
                        className="flex-1 rounded-lg border border-white/[0.08] bg-black/40 px-2.5 py-1 text-[13px] font-medium text-white outline-none focus:border-[#2997FF]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Toast Notification System */}
      {toast && (
        <div className="absolute top-16 right-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-[#1c1c1e]/90 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            {toast.type === "error" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : toast.type === "warning" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-semibold text-white">
              {toast.type === "error" ? "Export Failed" : toast.type === "warning" ? "Notice" : "Export Success"}
            </h4>
            <p className="text-[11px] text-white/60 mt-0.5 leading-normal">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-white/30 hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
