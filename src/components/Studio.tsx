"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/lib/store";
import { CAPTION_THEMES } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { CaptionTransformBox } from "./CaptionTransformBox";

const FPS = 30;

const ASPECTS = [
  { id: "9:16", label: "9:16", w: 1080, h: 1920 },
  { id: "1:1", label: "1:1", w: 1080, h: 1080 },
  { id: "16:9", label: "16:9", w: 1920, h: 1080 },
] as const;

const PRESET_COLORS = [
  "#ffffff",
  "#00e5ff",
  "#f97316",
  "#ffd60a",
  "#ff3b30",
  "#30d158",
  "#af52de",
];

export function Studio() {
  const {
    videoUrl,
    words,
    captionTheme,
    captionPosition,
    setCaptionPosition,
    captionScale,
    setCaptionScale,
    customAccentColor,
    setCustomAccentColor,
    durationInSeconds,
    status,
    progress,
    setStatus,
    setProgress,
    setStatusMessage,
    setCaptionTheme,
  } = useApp();

  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]>(ASPECTS[0]);
  const [exporting, setExporting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<"templates" | "settings" | "transcript">("templates");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const [playerDims, setPlayerDims] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const accent = useMemo(
    () => customAccentColor ?? CAPTION_THEMES.find((t) => t.id === captionTheme)?.accent ?? "#ffffff",
    [captionTheme, customAccentColor],
  );

  const durationInFrames = Math.max(1, Math.round(durationInSeconds * FPS));
  const ready = Boolean(videoUrl) && words.length > 0;

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
  }, [aspect]);

  // Video playback sync
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    let raf: number;
    const tick = () => {
      setCurrentTime(vid.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
    };
    vid.addEventListener("play", onPlay);
    vid.addEventListener("pause", onPause);
    vid.addEventListener("ended", onPause);
    if (!vid.paused) raf = requestAnimationFrame(tick);
    return () => {
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("pause", onPause);
      vid.removeEventListener("ended", onPause);
      cancelAnimationFrame(raf);
    };
  }, [videoUrl]);

  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play();
    else vid.pause();
  }, []);

  // Keyboard shortcut listener (Spacebar for play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) {
      videoRef.current.currentTime = pct * (videoRef.current.duration || 0);
    }
  }, []);

  const stepTime = useCallback((delta: number) => {
    if (videoRef.current) {
      const dur = videoRef.current.duration || 0;
      videoRef.current.currentTime = Math.max(0, Math.min(dur, videoRef.current.currentTime + delta));
    }
  }, []);

  // Active word index & current line text
  const activeWordIndex = useMemo(() => {
    if (!words.length) return -1;
    return words.findIndex((w) => currentTime >= w.start && currentTime <= w.end);
  }, [words, currentTime]);

  const activeLineText = useMemo(() => {
    if (activeWordIndex < 0) {
      // Find nearest word or first line
      if (words.length > 0 && currentTime < words[0].start) return words.slice(0, 3).map((w) => w.word).join(" ");
      return null;
    }
    const lineStart = Math.floor(activeWordIndex / 3) * 3;
    const lineWords = words.slice(lineStart, lineStart + 3);
    return lineWords.map((w) => w.word).join(" ");
  }, [words, activeWordIndex, currentTime]);

  const handleExport = async () => {
    if (!ready || !videoUrl) return;
    setExporting(true);
    setStatus("exporting");
    setProgress(0);
    setStatusMessage("Rendering high-quality video…");
    try {
      const { renderMediaOnWeb } = await import("@remotion/web-renderer");
      const controller = new AbortController();

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: "snipcaptions",
          component: (await import("./CaptionComposition")).CaptionComposition as never,
          durationInFrames,
          fps: FPS,
          width: aspect.w,
          height: aspect.h,
        } as never,
        inputProps: {
          src: videoUrl,
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

  const progressPct = durationInSeconds > 0 ? (currentTime / durationInSeconds) * 100 : 0;

  return (
    <div className="flex h-[calc(100vh-108px)] w-full flex-col overflow-hidden bg-[#0A0A0C]">
      {/* Studio Header Toolbar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#121214] px-5">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/[0.06]">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAspect(a)}
              className={`rounded-lg px-3 py-1 text-[12px] font-medium transition-all ${
                aspect.id === a.id
                  ? "bg-[#2997FF] text-white shadow-md shadow-[#2997FF]/20"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCaptionPosition({ x: 50, y: 80 });
              setCaptionScale(1.0);
            }}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            Reset Position
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || !ready}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2997FF] to-[#0066CC] px-4 py-1.5 text-[13px] font-semibold text-white shadow-lg shadow-[#2997FF]/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
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

      {/* Main Studio View (Left Player + Right Sidebar) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Player Viewport */}
        <div className="flex flex-1 flex-col overflow-hidden bg-black/60">
          <div className="flex flex-1 items-center justify-center p-4">
            {ready && videoUrl ? (
              <div
                ref={playerContainerRef}
                className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-black border border-white/[0.08] shadow-2xl"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  aspectRatio: `${aspect.w} / ${aspect.h}`,
                }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="h-full w-full object-contain"
                  playsInline
                  loop
                  onClick={togglePlay}
                />

                {/* Fabric.js TransformBox Overlay */}
                {playerDims.width > 0 && playerDims.height > 0 && (
                  <CaptionTransformBox
                    containerWidth={playerDims.width}
                    containerHeight={playerDims.height}
                    activeText={activeLineText ?? "Sample Caption"}
                  />
                )}

                {/* Dynamic Live Caption Display */}
                {activeLineText && (
                  <div
                    className="absolute pointer-events-none z-10 text-center px-4"
                    style={{
                      left: `${captionPosition.x}%`,
                      top: `${captionPosition.y}%`,
                      transform: `translate(-50%, -50%) scale(${captionScale})`,
                      maxWidth: "90%",
                    }}
                  >
                    <div
                      className="rounded-xl px-4 py-2 text-center"
                      style={{
                        background: captionTheme === "clean" ? "rgba(0,0,0,0.65)" : "transparent",
                        backdropFilter: captionTheme === "clean" ? "blur(8px)" : undefined,
                      }}
                    >
                      <p
                        className="text-[22px] font-extrabold leading-tight tracking-tight"
                        style={{
                          color: captionTheme === "neon" ? accent : "#fff",
                          textShadow:
                            captionTheme === "neon"
                              ? `0 0 12px ${accent}, 0 0 28px ${accent}`
                              : "0 2px 10px rgba(0,0,0,0.6)",
                          fontFamily:
                            captionTheme === "clean" || captionTheme === "highlight"
                              ? "var(--font-display)"
                              : "var(--font-creative)",
                        }}
                      >
                        {activeLineText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Play Overlay Button when paused */}
                {!playing && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all hover:bg-black/30"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-xl transition-transform hover:scale-110">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#000">
                        <polygon points="6,3 20,12 6,21" />
                      </svg>
                    </div>
                  </button>
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

          {/* Bottom Timeline Bar */}
          <div className="shrink-0 border-t border-white/[0.06] bg-[#121214] px-5 py-2.5">
            <div className="flex items-center gap-4">
              {/* Playback Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = 0;
                  }}
                  title="Jump to Start"
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="19 20 9 12 19 4 19 20" />
                    <line x1="5" y1="19" x2="5" y2="5" />
                  </svg>
                </button>
                <button
                  onClick={() => stepTime(-1)}
                  title="Rewind 1s"
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="11 17 6 12 11 7" />
                    <polyline points="18 17 13 12 18 7" />
                  </svg>
                </button>
                <button
                  onClick={togglePlay}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2997FF] text-white shadow-md shadow-[#2997FF]/30 transition-transform hover:scale-105"
                >
                  {playing ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="6,3 20,12 6,21" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => stepTime(1)}
                  title="Forward 1s"
                  className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" />
                  </svg>
                </button>
              </div>

              {/* Time Display */}
              <span className="min-w-[95px] text-[12px] font-mono text-white/50">
                {formatTime(currentTime)} / {formatTime(durationInSeconds)}
              </span>

              {/* Timeline Track & Playhead */}
              <div ref={timelineRef} onClick={seek} className="group relative flex-1 cursor-pointer py-2">
                {/* Word Blocks Track */}
                <div className="relative h-6 w-full overflow-hidden rounded-md bg-white/[0.04] border border-white/[0.06]">
                  {words.map((w, i) => {
                    const left = durationInSeconds > 0 ? (w.start / durationInSeconds) * 100 : 0;
                    const width = durationInSeconds > 0 ? ((w.end - w.start) / durationInSeconds) * 100 : 0;
                    const isActive = i === activeWordIndex;
                    return (
                      <div
                        key={i}
                        className="absolute top-1 h-4 rounded-sm transition-all duration-75"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 0.4)}%`,
                          background: isActive ? accent : "rgba(255,255,255,0.18)",
                          boxShadow: isActive ? `0 0 8px ${accent}60` : undefined,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Progress Scrubber Fill */}
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-[#2997FF] transition-all duration-75"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Playhead Marker */}
                <div
                  className="absolute top-0 h-9 w-3 -translate-x-1/2 rounded-md bg-white shadow-xl transition-[left] duration-75 border border-black/20"
                  style={{ left: `${progressPct}%` }}
                >
                  <div className="mx-auto mt-2 h-4 w-0.5 rounded-full bg-[#2997FF]" />
                </div>
              </div>
            </div>
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
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                    Built-in Templates
                  </span>
                  <span className="rounded-full bg-[#2997FF]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#2997FF]">
                    {CAPTION_THEMES.length} Available
                  </span>
                </div>

                {CAPTION_THEMES.map((t) => {
                  const isSelected = t.id === captionTheme;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setCaptionTheme(t.id)}
                      className={`group w-full rounded-2xl p-3.5 text-left transition-all duration-200 ${
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

                      <p className="mt-2 text-[11px] text-white/40 leading-snug">{t.description}</p>
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
