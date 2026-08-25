"use client";

import { useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { CaptionComposition } from "./CaptionComposition";
import { ThemePicker } from "./ThemePicker";
import { AdInterstitial } from "./Ads";
import { useApp } from "@/lib/store";
import { CAPTION_THEMES } from "@/lib/types";
import { cn } from "@/lib/utils";

const FPS = 30;

const ASPECTS = [
  { id: "9:16", label: "9:16 · Reels/Shorts", w: 1080, h: 1920 },
  { id: "1:1", label: "1:1 · Square", w: 1080, h: 1080 },
  { id: "16:9", label: "16:9 · Landscape", w: 1920, h: 1080 },
] as const;

export function Studio() {
  const {
    videoUrl,
    words,
    captionTheme,
    durationInSeconds,
    status,
    statusMessage,
    progress,
    setStatus,
    setProgress,
    setStatusMessage,
  } = useApp();

  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]>(ASPECTS[0]);
  const [exporting, setExporting] = useState(false);

  const accent = useMemo(
    () => CAPTION_THEMES.find((t) => t.id === captionTheme)?.accent ?? "#ffffff",
    [captionTheme],
  );

  const durationInFrames = Math.max(1, Math.round(durationInSeconds * FPS));

  const ready = Boolean(videoUrl) && words.length > 0;

  const handleExport = async () => {
    if (!ready || !videoUrl) return;
    setExporting(true);
    setStatus("exporting");
    setProgress(0);
    setStatusMessage("Rendering video in your browser…");
    try {
      const { renderMediaOnWeb } = await import("@remotion/web-renderer");
      const controller = new AbortController();

      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: "snipcaptions",
          component: CaptionComposition as never,
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
          const value =
            typeof p === "number" ? p : (p as { progress?: number })?.progress ?? 0;
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
      setStatusMessage("Export complete — your video is downloading.");
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "VIDEO_EXPORT" }),
      }).catch(() => {});
    } catch (e) {
      setStatusMessage(
        e instanceof Error ? e.message : "Export failed in this browser.",
      );
    } finally {
      setExporting(false);
      setStatus("ready");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AdInterstitial
        open={exporting}
        title="Thanks for using SnipCaptions — your HD export is rendering locally."
      />

      {/* Preview */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--editor-panel)] p-4">
        <div className="overflow-hidden rounded-xl bg-black">
          {ready ? (
            <div style={{ aspectRatio: `${aspect.w} / ${aspect.h}` }}>
              <Player
                component={CaptionComposition as never}
                inputProps={{ src: videoUrl, words, theme: captionTheme, accentColor: accent }}
                durationInFrames={durationInFrames}
                fps={FPS}
                compositionWidth={aspect.w}
                compositionHeight={aspect.h}
                style={{ width: "100%", height: "100%" }}
                controls
                loop
              />
            </div>
          ) : (
            <div
              className="flex items-center justify-center text-sm text-[var(--editor-text-muted)]"
              style={{ aspectRatio: `${aspect.w} / ${aspect.h}` }}
            >
              Upload a video and generate captions to preview.
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={!ready}
              onClick={() => setAspect(a)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                aspect.id === a.id
                  ? "border-[var(--editor-accent)] bg-[var(--editor-card)] text-[var(--editor-text)]"
                  : "border-[var(--border)] text-[var(--editor-text-muted)] hover:border-[var(--editor-accent)]/60",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-5">
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--editor-text-muted)]">
            Caption Theme
          </h3>
          <ThemePicker />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--editor-panel)] p-4">
          <button
            type="button"
            onClick={handleExport}
            disabled={!ready || exporting}
            className="w-full rounded-xl bg-[var(--brand-orange)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {exporting
              ? `Exporting… ${Math.round(progress * 100)}%`
              : "Export 1080p MP4 (No Watermark)"}
          </button>

          {exporting ? (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--editor-card)]">
              <div
                className="h-full rounded-full bg-[var(--brand-orange)] transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          ) : null}

          <p className="mt-3 text-xs text-[var(--editor-text-muted)]">
            Rendering uses Remotion&apos;s in-browser WebCodecs engine. Your file
            never leaves the device.
          </p>
        </div>

        {status === "exporting" && statusMessage ? (
          <p className="text-xs text-[var(--editor-text-muted)]">{statusMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
