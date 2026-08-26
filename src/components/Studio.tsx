"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Player } from "@remotion/player";
import { useApp } from "@/lib/store";
import { CAPTION_THEMES } from "@/lib/types";
import { CaptionComposition } from "./CaptionComposition";
import { CaptionTransformBox } from "./CaptionTransformBox";

const FPS = 30;

const PRESET_COLORS = [
  "#ffffff",
  "#00e5ff",
  "#f97316",
  "#ffd60a",
  "#ff3b30",
  "#30d158",
  "#af52de",
];

// Fallback dummy words for instant studio UI preview & coding
const DUMMY_WORDS = [
  { word: "the", start: 0.1, end: 0.4 },
  { word: "quick", start: 0.45, end: 0.8 },
  { word: "brown", start: 0.85, end: 1.2 },
  { word: "fox", start: 1.25, end: 1.6 },
  { word: "jumps", start: 1.65, end: 2.0 },
  { word: "over", start: 2.05, end: 2.4 },
  { word: "the", start: 2.45, end: 2.7 },
  { word: "lazy", start: 2.75, end: 3.1 },
  { word: "dog", start: 3.15, end: 3.6 },
];

export function Studio() {
  const {
    videoUrl,
    words: storeWords,
    captionTheme,
    captionPosition,
    setCaptionPosition,
    captionScale,
    setCaptionScale,
    customAccentColor,
    setCustomAccentColor,
    durationInSeconds: storeDuration,
    status,
    progress,
    setStatus,
    setProgress,
    setStatusMessage,
    setCaptionTheme,
  } = useApp();

  // Use uploaded words/duration or fallback dummy data for instant live preview
  const words = storeWords && storeWords.length > 0 ? storeWords : DUMMY_WORDS;
  const durationInSeconds = storeDuration > 0 ? storeDuration : 5;

  const [exporting, setExporting] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"templates" | "settings">("templates");

  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const [playerDims, setPlayerDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const accent = useMemo(
    () => customAccentColor ?? CAPTION_THEMES.find((t) => t.id === captionTheme)?.accent ?? "#ffffff",
    [captionTheme, customAccentColor],
  );

  const durationInFrames = Math.max(1, Math.round(durationInSeconds * FPS));
  const ready = Boolean(videoUrl) || words.length > 0;

  // Auto detect natural aspect ratio when video URL is present
  useEffect(() => {
    if (!videoUrl) return;
    const v = document.createElement("video");
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

  const handleExport = async () => {
    if (!ready) return;
    setExporting(true);
    setStatus("exporting");
    setProgress(0);
    setStatusMessage("Rendering high-quality video…");
    try {
      const { renderMediaOnWeb } = await import("@remotion/web-renderer");
      const controller = new AbortController();

      const aspectW = naturalAspect ? Math.round(1080 * naturalAspect) : 1080;
      const aspectH = 1920;

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: "snipcaptions",
          component: CaptionComposition as never,
          durationInFrames,
          fps: FPS,
          width: aspectW,
          height: aspectH,
        } as never,
        inputProps: {
          src: videoUrl || "",
          words,
          theme: captionTheme,
          accentColor: accent,
          position: captionPosition,
          scale: captionScale,
        },
        container: "mp4",
        videoBitrate: "medium",
        audioBitrate: "medium",
        signal: controller.signal,
        onProgress: (p: unknown) => {
          const value = typeof p === "number" ? p : (p as { progress?: number })?.progress ?? 0;
          setProgress(value);
        },
      });

      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snipcaptions-${captionTheme}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setProgress(1);
      setStatusMessage("Export complete!");
    } catch (e) {
      console.error("[Studio] export error", e);
      setStatusMessage(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
      setStatus("ready");
    }
  };

  return (
    <div className="flex h-[calc(100vh-108px)] w-full flex-col overflow-hidden bg-[#0A0A0C]">
      {/* Studio Header Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#121214] px-5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white/90">
            Video Studio
          </span>
          {naturalAspect && (
            <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-white/50">
              {naturalAspect > 1 ? "16:9 Landscape" : naturalAspect < 0.9 ? "9:16 Portrait" : "1:1 Square"}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting || !ready}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2997FF] to-[#0066CC] px-4 py-1.5 text-[13px] font-semibold text-white shadow-lg shadow-[#2997FF]/25 transition-all disabled:opacity-40"
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
                <span>Export Video</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Studio View (Remotion Player + Right Sidebar) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Player Viewport with Remotion Built-in Player */}
        <div className="flex flex-1 flex-col overflow-hidden bg-black/60">
          <div className="flex flex-1 items-center justify-center p-3 sm:p-5 min-h-0 min-w-0">
            {ready ? (
              <div
                ref={playerContainerRef}
                className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-black border border-white/[0.08] shadow-2xl h-full w-full max-h-full max-w-full"
                style={{
                  aspectRatio: naturalAspect ? `${naturalAspect}` : undefined,
                }}
              >
                <Player
                  component={CaptionComposition}
                  inputProps={{
                    src: videoUrl || "",
                    words,
                    theme: captionTheme,
                    accentColor: accent,
                    position: captionPosition,
                    scale: captionScale,
                  }}
                  durationInFrames={durationInFrames}
                  fps={FPS}
                  compositionWidth={naturalAspect && naturalAspect > 1 ? 1920 : 1080}
                  compositionHeight={naturalAspect && naturalAspect > 1 ? Math.round(1920 / naturalAspect) : 1920}
                  controls
                  loop
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                />

                {/* Fabric.js TransformBox Overlay */}
                {playerDims.width > 0 && playerDims.height > 0 && (
                  <CaptionTransformBox
                    containerWidth={playerDims.width}
                    containerHeight={playerDims.height}
                  />
                )}
              </div>
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

        {/* Right: Studio Sidebar (Templates & Style Options) */}
        <div className="w-[310px] shrink-0 border-l border-white/[0.06] bg-[#121214] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] bg-black/20">
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex-1 py-3 text-[12px] font-semibold transition-all ${
                activeTab === "templates"
                  ? "border-b-2 border-[#2997FF] text-white bg-white/[0.02]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex-1 py-3 text-[12px] font-semibold transition-all ${
                activeTab === "settings"
                  ? "border-b-2 border-[#2997FF] text-white bg-white/[0.02]"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              Style & Color
            </button>
          </div>

          {/* Sidebar Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                      <div className="flex h-14 items-center justify-center rounded-xl bg-black/60 border border-white/[0.04] p-2">
                        <p
                          className="text-[17px] font-extrabold tracking-tight"
                          style={{
                            color: t.accent,
                            fontFamily:
                              t.id === "clean" || t.id === "highlight"
                                ? "var(--font-display)"
                                : "var(--font-creative)",
                            textShadow:
                              t.id === "neon" ? `0 0 10px ${t.accent}, 0 0 22px ${t.accent}` : undefined,
                          }}
                        >
                          the quick <span style={{ color: t.accent }}>BROWN</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-5">
                {/* Accent Color Picker */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/40 block mb-2">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCustomAccentColor(c)}
                        className={`h-8 w-8 rounded-full border-2 transition-transform ${
                          accent === c ? "scale-110 border-white shadow-lg" : "border-transparent opacity-80 hover:opacity-100"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                    {customAccentColor && (
                      <button
                        onClick={() => setCustomAccentColor(null)}
                        className="rounded-full border border-white/20 px-2 text-[10px] text-white/50 hover:text-white"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Caption Scale */}
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

                {/* Position Coordinates */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 block">
                    Transform Box Position
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[12px] font-mono text-white/70">
                    <div className="rounded-lg bg-black/40 p-2">X: {captionPosition.x}%</div>
                    <div className="rounded-lg bg-black/40 p-2">Y: {captionPosition.y}%</div>
                  </div>
                  <button
                    onClick={() => {
                      setCaptionPosition({ x: 50, y: 80 });
                      setCaptionScale(1.0);
                    }}
                    className="w-full mt-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[11px] text-white/70 hover:bg-white/[0.08]"
                  >
                    Reset Position & Scale
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
