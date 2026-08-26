"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Player, PlayerRef } from "@remotion/player";
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

// Fallback dummy words for instant studio UI preview
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
    customFontFamily,
    setCustomFontFamily,
    durationInSeconds: storeDuration,
    status,
    progress,
    setStatus,
    setProgress,
    setStatusMessage,
    setCaptionTheme,
    updateWord,
    recentColors,
  } = useApp();

  // Use uploaded words/duration or fallback dummy data for live preview
  const words = storeWords && storeWords.length > 0 ? storeWords : DUMMY_WORDS;
  const durationInSeconds = storeDuration > 0 ? storeDuration : 5;

  const [exporting, setExporting] = useState(false);
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"templates" | "settings" | "transcript">("templates");
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Monitor play/pause status of the Remotion Player
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);

    // Sync initial state
    setIsPlaying(player.isPlaying());

    return () => {
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [videoUrl]);

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

      const aspectW = naturalAspect && naturalAspect > 1 ? 1920 : 1080;
      const aspectH = naturalAspect && naturalAspect > 1 ? Math.round(1920 / naturalAspect) : 1920;

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
          customFontFamily,
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
            onClick={downloadSRT}
            disabled={!ready || words.length === 0}
            className="flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] px-3.5 py-1.5 text-[13px] font-semibold text-white/90 transition-all disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download SRT</span>
          </button>

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
        {/* Left: Player Viewport */}
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
                  ref={playerRef}
                  component={CaptionComposition}
                  inputProps={{
                    src: videoUrl || "",
                    words,
                    theme: captionTheme,
                    accentColor: accent,
                    position: captionPosition,
                    scale: captionScale,
                    customFontFamily,
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

                {/* Fabric.js TransformBox Overlay (Only active when paused) */}
                {playerDims.width > 0 && playerDims.height > 0 && !isPlaying && (
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

        {/* Right: Studio Sidebar (3 Tabs: Templates, Style & Position, Transcript) */}
        <div className="w-[320px] shrink-0 border-l border-white/[0.06] bg-[#121214] flex flex-col">
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
                        {t.id === "snipcap_special" && (
                          <div className="text-center leading-none">
                            <div className="text-[9px] text-white/40 lowercase">the quick</div>
                            <div className="text-[15px] font-black uppercase my-0.5" style={{ color: accent, textShadow: `0 0 8px ${accent}` }}>BROWN</div>
                            <div className="text-[9px] text-white/40 lowercase">fox jumps</div>
                          </div>
                        )}
                        {t.id === "black_punch" && (
                          <div className="text-center leading-none">
                            <div className="text-[9px] text-white/30 uppercase">THE QUICK</div>
                            <div className="text-[15px] font-black uppercase mt-1" style={{ color: "#000000", WebkitTextStroke: "0.5px rgba(255,255,255,0.8)" }}>BROWN</div>
                          </div>
                        )}
                        {t.id === "liquid_glass" && (
                          <div
                            className="text-[11px] font-medium"
                            style={{
                              background: "rgba(255,255,255,0.1)",
                              border: "1px solid rgba(255,255,255,0.2)",
                              borderRadius: "20px",
                              padding: "4px 12px",
                              display: "inline-flex",
                              gap: "4px",
                            }}
                          >
                            <span className="text-white/40">the</span>
                            <span className="text-white font-bold" style={{ color: accent }}>quick</span>
                            <span className="text-white/40">fox</span>
                          </div>
                        )}
                        {t.id === "one_word" && (
                          <div className="text-center leading-none font-bold">
                            <span className="text-[16px] uppercase tracking-wide" style={{ color: accent }}>BROWN</span>
                          </div>
                        )}
                        {t.id !== "snipcap_special" && t.id !== "black_punch" && t.id !== "liquid_glass" && t.id !== "one_word" && (
                          <p
                            className="text-[15px] font-extrabold tracking-tight"
                            style={{
                              color: t.id === "clean" ? "#ffffff" : accent,
                              fontFamily:
                                t.id === "clean" || t.id === "highlight"
                                  ? "var(--font-display)"
                                  : "var(--font-creative)",
                              textShadow:
                                t.id === "neon" ? `0 0 10px ${accent}, 0 0 22px ${accent}` : undefined,
                            }}
                          >
                            the quick <span style={{ color: accent }}>BROWN</span>
                          </p>
                        )}
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

                {/* Recently Used Colors Batch (Apple Style) */}
                {recentColors.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                        Recently Used
                      </span>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-mono text-white/40">
                        {recentColors.length} saved
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {recentColors.map((c, i) => (
                        <button
                          key={`${c}-${i}`}
                          onClick={() => setCustomAccentColor(c)}
                          className={`h-7 w-7 rounded-full border-2 transition-transform duration-150 ${
                            accent.toLowerCase() === c.toLowerCase()
                              ? "scale-110 border-white shadow-lg ring-2 ring-[#2997FF]"
                              : "border-white/10 opacity-80 hover:opacity-100 hover:scale-105"
                          }`}
                          style={{ background: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Font Selector / Font Pair Feature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                      Typography / Emotions
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
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {[
                      { name: "SF Pro Display", value: '"SF Pro Display", sans-serif', desc: "Clean & Apple" },
                      { name: "Gilroy ExtraBold", value: '"Gilroy", sans-serif', desc: "Modern & Punchy" },
                      { name: "Helvetica Rounded", value: '"Helvetica Rounded", sans-serif', desc: "Soft & Comic" },
                      { name: "Helvetica Bold", value: '"Helvetica Bold", sans-serif', desc: "Impact & Glow" },
                      { name: "Readex Pro", value: '"Readex Pro", sans-serif', desc: "Clean & Rounded" },
                      { name: "Celosia Nature", value: '"Celosia Nature", sans-serif', desc: "Elegant script" },
                      { name: "Longmile", value: '"Longmile", sans-serif', desc: "Bold Display" },
                      { name: "NCL Gasdrifo", value: '"NCL Gasdrifo", sans-serif', desc: "Distorted Creative" },
                      { name: "Retro Floral", value: '"Retro Floral", sans-serif', desc: "Decorative Retro" },
                      { name: "Qurova Light", value: '"Qurova Light", sans-serif', desc: "Premium Light serif" },
                    ].map((f) => {
                      const isActive = customFontFamily === f.value;
                      return (
                        <button
                          key={f.name}
                          type="button"
                          onClick={() => setCustomFontFamily(f.value)}
                          className={`rounded-xl border p-2 text-left transition-all duration-150 ${
                            isActive
                              ? "border-[#2997FF] bg-[#2997FF]/10 text-white"
                              : "border-white/[0.06] bg-white/[0.02] text-white/70 hover:bg-white/[0.04] hover:text-white"
                          }`}
                          style={{ fontFamily: f.value }}
                        >
                          <div className="text-[11px] font-extrabold truncate">{f.name}</div>
                          <div className="text-[9px] text-white/40 truncate mt-0.5">{f.desc}</div>
                        </button>
                      );
                    })}
                  </div>
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
              </div>
            )}

            {/* Tab 3: Manual Word Transcript Correction */}
            {activeTab === "transcript" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Transcribed Words ({words.length})
                  </span>
                  <span className="text-[10px] text-white/30">
                    Click word to edit
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
    </div>
  );
}
