import { PixiCaptionRenderer } from "./pixi/PixiCaptionRenderer";
import type { CaptionPosition, CaptionThemeId, Word } from "./types";
import { preloadAllFonts } from "./fontLoader";

export interface ExportOptions {
  videoFile: File | Blob;
  videoUrl: string;
  words: Word[];
  theme: CaptionThemeId;
  accentColor: string;
  position: CaptionPosition;
  scale: number;
  customFontFamily?: string | null;
  width: number;
  height: number;
  fps?: number;
  durationInSeconds: number;
  onProgress?: (p: {
    progress: number;
    currentFrame: number;
    totalFrames: number;
    fps: number;
    stage: string;
  }) => void;
  signal?: AbortSignal;
}

/**
 * Picks the best supported MIME type for MediaRecorder.
 * Prefers MP4/H.264 (supported natively since Chrome 130+ and Safari).
 * Falls back to WebM on older browsers / Firefox.
 */
function getSupportedMimeType(): string {
  const candidates = [
    "video/mp4;codecs=avc1,opus",  // Chrome 130+ with audio
    "video/mp4;codecs=avc1",        // Chrome 130+ / Safari
    "video/mp4",                    // Safari generic
    "video/webm;codecs=vp9,opus",   // Firefox / older Chrome fallback
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "video/mp4";
}

function getExtensionFromMime(mime: string): string {
  if (mime.startsWith("video/webm")) return "webm";
  return "mp4"; // mp4 for everything else (mp4, unknown)
}

/**
 * Returns the correct output file extension for the current browser.
 * Use this to set the download filename on the Export button.
 */
export function getExportFileExtension(): string {
  return getExtensionFromMime(getSupportedMimeType());
}

/**
 * Seek a video element to a given time and wait for the seeked event.
 * Includes a 2 s watchdog so exports never hang.
 */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const clamped = Math.max(
      0,
      Math.min(time, video.duration > 0 ? video.duration - 0.001 : time),
    );

    if (
      Math.abs(video.currentTime - clamped) < 0.002 &&
      !video.seeking &&
      video.readyState >= 2
    ) {
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener("seeked", finish);
      video.removeEventListener("error", finish);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, 2000);
    video.addEventListener("seeked", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
    try {
      video.currentTime = clamped;
    } catch {
      finish();
    }
  });
}

/**
 * Main export function.
 *
 * How it works (works on ALL modern browsers — no WebCodecs needed):
 *  1. Play the original video at 1× speed in a muted offscreen video element.
 *  2. Each rAF tick: update the Pixi GPU texture + render captions onto an
 *     offscreen canvas at the target export resolution.
 *  3. Capture the canvas via canvas.captureStream(fps) — a standard browser API.
 *  4. Capture audio from an unmuted clone of the video via captureStream().
 *  5. Feed both tracks into a MediaRecorder and collect the blobs.
 *  6. On video end (or duration timeout) stop the recorder and return the Blob.
 *
 * Result: smooth real-time compositing with no frame drops, no seek latency,
 * and no codec negotiation. Outputs WebM (VP8/VP9) on Chrome/Firefox and MP4
 * on browsers that prefer it (Safari 15.4+).
 */
export async function exportVideo(options: ExportOptions): Promise<Blob> {
  const {
    videoFile,
    videoUrl,
    words,
    theme,
    accentColor,
    position,
    scale,
    customFontFamily,
    width,
    height,
    fps = 30,
    durationInSeconds,
    onProgress,
    signal,
  } = options;

  console.time("[Export] Total export time");
  onProgress?.({ progress: 0.02, currentFrame: 0, totalFrames: 0, fps: 0, stage: "Preloading assets…" });

  // ── 1. Fonts ─────────────────────────────────────────────────────────────
  await preloadAllFonts();
  if (signal?.aborted) throw new Error("Export cancelled.");

  // ── 2. Muted offscreen video (drives the GPU texture) ────────────────────
  const video = document.createElement("video");
  video.muted = true; // must be muted for browser to allow autoplay
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  let createdBlobUrl = "";

  const tryLoad = (src: string): Promise<boolean> =>
    new Promise((res) => {
      if (!src) return res(false);
      const ok = () => { cleanup(); res(true); };
      const fail = () => { cleanup(); res(false); };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", ok);
        video.removeEventListener("error", fail);
      };
      video.addEventListener("loadedmetadata", ok);
      video.addEventListener("error", fail);
      video.src = src;
      video.load();
    });

  let hasVideo = false;
  if (videoUrl) hasVideo = await tryLoad(videoUrl);

  if (!hasVideo && videoFile && videoFile.size > 0) {
    try {
      createdBlobUrl = URL.createObjectURL(videoFile);
      hasVideo = await tryLoad(createdBlobUrl);
    } catch (e) {
      console.warn("[Export] Could not create Object URL from videoFile:", e);
    }
  }

  if (!hasVideo) {
    console.warn("[Export] No playable video found. Exporting captions on black background.");
  }

  // Warm-up the decoder so the very first frame is never blank
  if (hasVideo) await seekTo(video, 0);

  const duration =
    durationInSeconds > 0
      ? durationInSeconds
      : hasVideo && video.duration > 0
      ? video.duration
      : 5;

  const totalFrames = Math.round(duration * fps);

  onProgress?.({ progress: 0.05, currentFrame: 0, totalFrames, fps: 0, stage: "Initialising renderer…" });

  // ── 3. PixiJS caption renderer ───────────────────────────────────────────
  const renderer = new PixiCaptionRenderer();
  await renderer.init(width, height);

  const captionConfig = { width, height, words, theme, accentColor, position, scale, customFontFamily };
  renderer.updateConfig(captionConfig);

  if (hasVideo && video.videoWidth > 0 && video.videoHeight > 0) {
    renderer.mountVideoBackground(video, video.videoWidth, video.videoHeight);
  }

  // ── 4. Unmuted audio clone ────────────────────────────────────────────────
  // The export video must stay muted (autoplay policy). A second unmuted element
  // gives us an audio track via captureStream().
  let audioStream: MediaStream | null = null;
  let audioVideoEl: HTMLVideoElement | null = null;

  if (hasVideo) {
    try {
      audioVideoEl = document.createElement("video");
      audioVideoEl.playsInline = true;
      audioVideoEl.preload = "auto";
      audioVideoEl.muted = false;   // must be false for captureStream() to include audio
      audioVideoEl.volume = 0;      // silence speakers — captureStream captures pre-volume audio
      audioVideoEl.crossOrigin = "anonymous";
      audioVideoEl.src = video.src;

      await new Promise<void>((res) => {
        audioVideoEl!.addEventListener("loadedmetadata", () => res(), { once: true });
        audioVideoEl!.addEventListener("error", () => res(), { once: true });
        setTimeout(res, 3000);
        audioVideoEl!.load();
      });

      const captureStreamFn: (() => MediaStream) | null =
        (audioVideoEl as any).captureStream?.bind(audioVideoEl) ??
        (audioVideoEl as any).mozCaptureStream?.bind(audioVideoEl) ??
        null;

      if (captureStreamFn) {
        const stream = captureStreamFn();
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioStream = new MediaStream(audioTracks);
          console.log("[Export] Audio capture ready:", audioTracks[0].label);
        }
      }
    } catch (e) {
      console.warn("[Export] Audio capture unavailable — exporting without audio:", e);
      audioStream = null;
    }
  }

  // ── 5. Canvas capture stream ──────────────────────────────────────────────
  const canvas = renderer.canvas as HTMLCanvasElement;
  let canvasStream: MediaStream;
  try {
    canvasStream = (canvas as any).captureStream(fps);
  } catch (e) {
    renderer.destroy();
    if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    throw new Error(
      "canvas.captureStream() is not supported in this browser. Please use Chrome, Edge, or Firefox.",
    );
  }

  // ── 6. Combine video + audio tracks ──────────────────────────────────────
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...(audioStream ? audioStream.getAudioTracks() : []),
  ]);

  // ── 7. MediaRecorder ─────────────────────────────────────────────────────
  const mimeType = getSupportedMimeType();
  const videoBitsPerSecond = Math.min(
    20_000_000,
    Math.max(4_000_000, Math.round(width * height * fps * 0.12)),
  );
  console.log(
    `[Export] MediaRecorder MIME: ${mimeType} · bitrate: ${(videoBitsPerSecond / 1_000_000).toFixed(1)} Mbps`,
  );

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond });
  } catch {
    try {
      recorder = new MediaRecorder(combinedStream, { mimeType });
    } catch {
      recorder = new MediaRecorder(combinedStream);
    }
  }

  const recordedChunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  if (signal?.aborted) throw new Error("Export cancelled.");

  // ── 8. Render loop ─────────────────────────────────────────────────────────
  //
  // PRIMARY:  requestVideoFrameCallback (RVFC) — fires exactly once per decoded
  //           video frame, perfectly synced to video playback. No wasted renders,
  //           no duplicate frames, no timing drift. Works even when tab is hidden.
  //           Supported: Chrome 83+, Edge 83+, Safari 15.4+, Firefox 132+.
  //
  // FALLBACK: setInterval at `fps` interval — used when RVFC is unavailable or
  //           when there is no video source (captions-only export).
  //
  type RvfcVideo = HTMLVideoElement & {
    requestVideoFrameCallback: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
    cancelVideoFrameCallback: (id: number) => void;
  };
  const supportsRVFC = hasVideo && typeof (video as RvfcVideo).requestVideoFrameCallback === "function";

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let rvfcId: number | null = null;
  let renderActive = true;
  let capturedFrameCount = 0;
  const loopStart = performance.now();
  const intervalMs = Math.round(1000 / fps);

  const reportProgress = (currentTime: number) => {
    if (capturedFrameCount % 12 !== 0) return;
    const elapsed = (performance.now() - loopStart) / 1000;
    const progress = Math.min(1, currentTime / duration);
    const renderFps = elapsed > 0 ? capturedFrameCount / elapsed : 0;
    const remaining = Math.max(0, Math.round(duration - currentTime));
    onProgress?.({
      progress: Math.min(0.93, 0.07 + progress * 0.86),
      currentFrame: capturedFrameCount,
      totalFrames,
      fps: Math.round(renderFps),
      stage: `Recording… ${Math.round(progress * 100)}% · ~${remaining}s left`,
    });
  };

  // RVFC loop — perfect per-frame sync with the video decoder
  const rvfcTick = (_now: number, meta: { mediaTime: number }) => {
    if (!renderActive) return;
    renderer.updateVideoFrame();
    renderer.renderTime(meta.mediaTime, captionConfig);
    capturedFrameCount++;
    reportProgress(meta.mediaTime);
    // Re-register for the next decoded frame
    rvfcId = (video as RvfcVideo).requestVideoFrameCallback(rvfcTick);
  };

  // setInterval fallback — used for no-video exports or old browsers
  const intervalTick = () => {
    if (!renderActive) return;
    const currentTime = hasVideo
      ? video.currentTime
      : (performance.now() - loopStart) / 1000;
    if (hasVideo) renderer.updateVideoFrame();
    renderer.renderTime(currentTime, captionConfig);
    capturedFrameCount++;
    reportProgress(currentTime);
  };


  // ── 9. Promise: play → record → stop → Blob ──────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    // Track abort so onstop doesn't resolve after a cancel
    let isAborted = false;

    const cleanup = () => {
      renderActive = false;
      if (rvfcId !== null && supportsRVFC) {
        (video as RvfcVideo).cancelVideoFrameCallback(rvfcId);
        rvfcId = null;
      }
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      renderer.destroy();
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
      if (audioVideoEl) {
        audioVideoEl.pause();
        audioVideoEl.src = "";
      }
    };

    recorder.onstop = () => {
      // If the user cancelled, don't resolve — the abort handler already rejected
      if (isAborted) {
        cleanup();
        return;
      }
      cleanup();
      const blob = new Blob(recordedChunks, { type: mimeType });
      console.timeEnd("[Export] Total export time");
      console.log(`[Export] Complete — ${(blob.size / 1_048_576).toFixed(2)} MB`);
      onProgress?.({ progress: 1.0, currentFrame: totalFrames, totalFrames, fps, stage: "Export complete!" });
      resolve(blob);
    };

    recorder.onerror = (e) => {
      cleanup();
      reject(new Error(`MediaRecorder error: ${(e as any)?.error?.message ?? String(e)}`));
    };

    // AbortSignal support
    if (signal) {
      signal.addEventListener("abort", () => {
        isAborted = true;
        renderActive = false;
        if (rvfcId !== null && supportsRVFC) { (video as RvfcVideo).cancelVideoFrameCallback(rvfcId); rvfcId = null; }
        if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
        video.pause();
        if (audioVideoEl) audioVideoEl.pause();
        if (recorder.state !== "inactive") recorder.stop();
        cleanup();
        reject(new Error("Export cancelled."));
      }, { once: true });
    }

    // Kick off render loop and recording
    // Use RVFC for perfect per-frame sync, fall back to setInterval
    if (supportsRVFC) {
      rvfcId = (video as RvfcVideo).requestVideoFrameCallback(rvfcTick);
    } else {
      intervalId = setInterval(intervalTick, intervalMs);
    }
    recorder.start(200); // emit data every 200 ms

    // Play both video elements
    const doPlay = async () => {
      try {
        if (hasVideo) {
          video.currentTime = 0;
          const plays: Promise<void>[] = [video.play()];
          if (audioVideoEl) {
            audioVideoEl.currentTime = 0;
            plays.push(audioVideoEl.play().catch(() => {}));
          }
          await Promise.all(plays);
        }

        // Safety timeout: stop after duration + 400 ms buffer
        const safetyMs = duration * 1000 + 400;
        const stopTimer = setTimeout(() => {
          video.pause();
          if (audioVideoEl) audioVideoEl.pause();
          if (recorder.state !== "inactive") recorder.stop();
        }, safetyMs);

        // Also stop when the video naturally ends
        if (hasVideo) {
          video.addEventListener("ended", () => {
            clearTimeout(stopTimer);
            if (audioVideoEl) audioVideoEl.pause();
            // Small delay to flush the last canvas frame into the recorder
            setTimeout(() => {
              if (recorder.state !== "inactive") recorder.stop();
            }, 150);
          }, { once: true });
        }
      } catch (err) {
        // No video — just record captions on black for the full duration
        console.warn("[Export] Playback failed, recording captions only:", err);
        setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, duration * 1000 + 400);
      }
    };

    void doPlay();
  });
}

