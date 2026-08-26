"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { CAPTION_THEMES } from "@/lib/types";
import { formatTime } from "@/lib/utils";

const FPS = 30;

const ASPECTS = [
  { id: "9:16", label: "9:16", w: 1080, h: 1920 },
  { id: "1:1", label: "1:1", w: 1080, h: 1080 },
  { id: "16:9", label: "16:9", w: 1920, h: 1080 },
] as const;

export function Studio() {
  const {
    videoUrl,
    words,
    captionTheme,
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const accent = useMemo(
    () => CAPTION_THEMES.find((t) => t.id === captionTheme)?.accent ?? "#ffffff",
    [captionTheme],
  );

  const durationInFrames = Math.max(1, Math.round(durationInSeconds * FPS));
  const ready = Boolean(videoUrl) && words.length > 0;

  // Video playback sync — use rAF for smooth 60fps updates
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

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoRef.current) {
      videoRef.current.currentTime = pct * (videoRef.current.duration || 0);
    }
  }, []);

  // Find active caption word for current time
  const activeWordIndex = useMemo(() => {
    if (!words.length) return -1;
    return words.findIndex((w) => currentTime >= w.start && currentTime <= w.end);
  }, [words, currentTime]);

  // Active line (group words into lines of 3)
  const activeLineText = useMemo(() => {
    if (activeWordIndex < 0) return null;
    const lineStart = Math.floor(activeWordIndex / 3) * 3;
    const lineWords = words.slice(lineStart, lineStart + 3);
    return lineWords.map((w) => w.word).join(" ");
  }, [words, activeWordIndex]);

  const handleExport = async () => {
    if (!ready || !videoUrl) return;
    setExporting(true);
    setStatus("exporting");
    setProgress(0);
    setStatusMessage("Rendering video…");
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
      setStatusMessage("Export complete");
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
    <div className="flex h-[calc(100vh-52px)] flex-col overflow-hidden">
      {/* Main content: Video left + Themes right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video preview */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center bg-black p-6">
            {ready && videoUrl ? (
              <div
                className="relative overflow-hidden rounded-2xl bg-black"
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
                {/* Caption overlay */}
                {activeLineText && (
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
                    <div
                      className="rounded-xl px-4 py-2 text-center"
                      style={{
                        background: "rgba(0,0,0,0.65)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <p
                        className="text-[22px] font-bold leading-tight"
                        style={{
                          color: captionTheme === "neon" ? accent : "#fff",
                          textShadow: captionTheme === "neon"
                            ? `0 0 12px ${accent}, 0 0 30px ${accent}`
                            : "0 2px 8px rgba(0,0,0,0.4)",
                          fontFamily: captionTheme === "clean" || captionTheme === "highlight"
                            ? "var(--font-display)"
                            : "var(--font-creative)",
                        }}
                      >
                        {activeLineText}
                      </p>
                    </div>
                  </div>
                )}
                {/* Play/pause overlay */}
                {!playing && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#000">
                        <polygon points="6,3 20,12 6,21" />
                      </svg>
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-[14px] text-white/20">No video</div>
            )}
          </div>

          {/* Timeline bar */}
          <div className="shrink-0 border-t border-white/[0.04] bg-[#111] px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Play controls */}
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = 0;
                }}
                className="text-white/40 transition-colors hover:text-white/70"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="19 20 9 12 19 4 19 20" />
                  <line x1="5" y1="19" x2="5" y2="5" />
                </svg>
              </button>
              <button
                onClick={togglePlay}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2997FF] text-white transition-transform hover:scale-105"
              >
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6,3 20,12 6,21" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = videoRef.current.duration || 0;
                }}
                className="text-white/40 transition-colors hover:text-white/70"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </button>

              {/* Time display */}
              <span className="min-w-[80px] text-[12px] font-mono text-white/40">
                {formatTime(currentTime)} / {formatTime(durationInSeconds)}
              </span>

              {/* Timeline scrubber */}
              <div
                ref={timelineRef}
                onClick={seek}
                className="group relative flex-1 cursor-pointer"
              >
                {/* Caption word blocks */}
                <div className="absolute inset-x-0 top-0 h-5 overflow-hidden rounded">
                  {words.map((w, i) => {
                    const left = durationInSeconds > 0 ? (w.start / durationInSeconds) * 100 : 0;
                    const width = durationInSeconds > 0 ? ((w.end - w.start) / durationInSeconds) * 100 : 0;
                    const isActive = i === activeWordIndex;
                    return (
                      <div
                        key={i}
                        className="absolute top-0.5 h-3.5 rounded-sm transition-colors duration-100"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 0.3)}%`,
                          background: isActive ? accent : "rgba(255,255,255,0.12)",
                          boxShadow: isActive ? `0 0 6px ${accent}40` : undefined,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Scrub track */}
                <div className="mt-6 h-1 w-full rounded-full bg-white/[0.06] group-hover:h-1.5">
                  <div
                    className="h-full rounded-full bg-white/30 transition-all duration-75"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-4 h-4 w-2.5 -translate-x-1/2 rounded-sm bg-white shadow-lg transition-[left] duration-75"
                  style={{ left: `${progressPct}%` }}
                />
              </div>

              {/* Zoom */}
              <span className="text-[11px] text-white/25">100%</span>
            </div>
          </div>
        </div>

        {/* Right: Themes sidebar */}
        <div className="w-[280px] border-l border-white/[0.04] bg-[#111]">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.04]">
            <button className="flex-1 py-3 text-[12px] font-medium text-white/40 transition-colors hover:text-white/60">
              Text
            </button>
            <button className="flex-1 border-b-2 border-[#2997FF] py-3 text-[12px] font-medium text-white">
              Templates
            </button>
          </div>

          {/* Built-in Templates badge */}
          <div className="px-4 pt-4">
            <span className="inline-block rounded-full bg-[#2997FF]/10 px-3 py-1 text-[11px] font-medium text-[#2997FF]">
              Built-in Templates
            </span>
          </div>

          {/* Dynamic Captions heading */}
          <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
            Dynamic Captions
          </p>

          {/* Theme cards */}
          <div className="space-y-2 px-3 pb-4">
            {CAPTION_THEMES.map((t) => {
              const active = t.id === captionTheme;
              return (
                <button
                  key={t.id}
                  onClick={() => setCaptionTheme(t.id)}
                  className="w-full rounded-xl p-3 text-left transition-all duration-200"
                  style={{
                    background: active ? "rgba(255,255,255,0.06)" : "transparent",
                    border: `1px solid ${active ? "rgba(255,255,255,0.1)" : "transparent"}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[13px] font-medium text-white/90">{t.name}</span>
                    {t.id === "neon" && (
                      <span className="rounded bg-[#2997FF]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#2997FF]">
                        Popular
                      </span>
                    )}
                    {t.id === "kinetic" && (
                      <span className="rounded bg-[#30D158]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[#30D158]">
                        New
                      </span>
                    )}
                  </div>
                  <div
                    className="flex h-14 items-center justify-center rounded-lg"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
                    <p
                      className="text-[18px] font-bold"
                      style={{
                        color: t.accent,
                        fontFamily: t.id === "clean" || t.id === "highlight"
                          ? "var(--font-display)"
                          : "var(--font-creative)",
                        textShadow: t.id === "neon" ? `0 0 8px ${t.accent}, 0 0 20px ${t.accent}` : undefined,
                      }}
                    >
                      the quick <span style={{ color: t.accent }}>BROWN</span>
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/40">
                      {t.id === "kinetic" || t.id === "highlight" ? "Word" : "Bold"}
                    </span>
                    {t.id === "neon" && (
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/40">
                        Glow
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
