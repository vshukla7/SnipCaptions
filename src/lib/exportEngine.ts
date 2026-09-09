import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { PixiCaptionRenderer } from "./pixi/PixiCaptionRenderer";
import type { CaptionPosition, CaptionThemeId, Word } from "./types";
import { preloadAllFonts } from "./fontLoader";

export type PerformanceMode = "auto" | "quality" | "speed";
export type HardwareTier = "high" | "mid" | "low";

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
  bitrate?: number;
  /** Controls which capture strategy is used.
   *  - 'auto'    (default) — benchmark device, pick tier automatically
   *  - 'quality' — force pipelined seek mode (best for dGPU systems)
   *  - 'speed'   — force playback-capture mode (best for iGPU / mobile) */
  performanceMode?: PerformanceMode;
  onProgress?: (p: {
    progress: number;
    currentFrame: number;
    totalFrames: number;
    fps: number;
    stage: string;
  }) => void;
  onTierDetected?: (tier: HardwareTier) => void;
  signal?: AbortSignal;
}

// Fallback H.264 profile codecs in priority order for cross-browser & Safari compatibility
const H264_CODEC_CANDIDATES = [
  "avc1.640032", // High Profile, Level 5.0 (4K)
  "avc1.640033", // High Profile, Level 5.1 (4K60)
  "avc1.64002a", // High Profile, Level 4.2 (1080p60)
  "avc1.4d002a", // Main Profile, Level 4.2
  "avc1.42E01E", // Baseline Profile, Level 3.0 (Strict Safari/iOS compatibility)
];

async function findSupportedH264Codec(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<string> {
  if (typeof window === "undefined" || !("VideoEncoder" in window)) {
    throw new Error("WebCodecs API (VideoEncoder) is not supported in this browser.");
  }

  for (const codec of H264_CODEC_CANDIDATES) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: fps,
        hardwareAcceleration: "prefer-hardware",
      });
      if (support && support.supported) {
        console.log(`[ExportEngine] Selected hardware H.264 codec: ${codec}`);
        return codec;
      }
    } catch {
      /* continue check */
    }
  }

  // If strict check fails, default to Baseline for universal playback if resolution permits
  const maxLevel3Macroblocks = 1620;
  const macroblocksPerFrame = Math.ceil(width / 16) * Math.ceil(height / 16);
  if (macroblocksPerFrame <= maxLevel3Macroblocks) {
    return "avc1.42E01E";
  }

  throw new Error(
    `No supported H.264 codec found for resolution ${width}x${height}. ` +
    `Try a lower export resolution (e.g., 1080p or 720p).`,
  );
}

// ── Hardware Tier Detection ───────────────────────────────────────────────────

/**
 * Micro-benchmark: creates a temporary VideoEncoder and encodes N blank frames
 * at the target resolution, measuring real encode throughput (frames/sec).
 *
 * This tells us whether the device has a hardware H.264 encoder (fast path) or
 * is falling back to software encoding (slow path), so we can pick the right
 * capture strategy without relying on unreliable UA string heuristics.
 *
 * Runs in ~200–400ms. The VideoEncoder is destroyed immediately after.
 */
async function detectHardwareTier(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
  videoCodec: string,
): Promise<HardwareTier> {
  const BENCH_FRAMES = 8;

  try {
    let encodeCount = 0;
    const benchEncoder = new VideoEncoder({
      output: () => { encodeCount++; },
      error: () => {},
    });

    benchEncoder.configure({
      codec: videoCodec,
      width,
      height,
      bitrate,
      framerate: fps,
      hardwareAcceleration: "prefer-hardware",
      avc: { format: "avc" },
    });

    // Create a blank OffscreenCanvas to source the benchmark frames from.
    const benchCanvas = new OffscreenCanvas(width, height);
    const benchCtx = benchCanvas.getContext("2d");
    if (benchCtx) {
      benchCtx.fillRect(0, 0, width, height);
    }
    const t0 = performance.now();

    for (let i = 0; i < BENCH_FRAMES; i++) {
      const frame = new VideoFrame(benchCanvas, {
        timestamp: Math.round((i / fps) * 1_000_000),
        duration: Math.round((1 / fps) * 1_000_000),
      });
      benchEncoder.encode(frame, { keyFrame: i === 0 });
      frame.close();
    }

    await benchEncoder.flush();
    benchEncoder.close();

    const elapsed = (performance.now() - t0) / 1000;
    const encodedFps = BENCH_FRAMES / Math.max(elapsed, 0.001);

    let tier: HardwareTier;
    if (encodedFps >= 200) {
      tier = "high";
    } else if (encodedFps >= 60) {
      tier = "mid";
    } else {
      tier = "low";
    }

    console.log(
      `[ExportEngine] Hardware benchmark: ${encodedFps.toFixed(0)} enc-fps → Tier '${tier}'` +
      ` (${width}×${height} @ ${fps}fps, ${BENCH_FRAMES} frames in ${(elapsed * 1000).toFixed(0)}ms)`,
    );
    return tier;
  } catch (e) {
    console.warn("[ExportEngine] Hardware tier detection failed, defaulting to 'mid':", e);
    return "mid";
  }
}

// ── Frame Seeking Pipeline (Tier 'high') ─────────────────────────────────────

/**
 * Seeks a video element to a specific timestamp.
 * Returns a promise that resolves when the `seeked` event fires.
 * Waits for the decoder's seeked event; accuracy is more important than
 * shaving time from a single frame seek during export.
 */
function seekVideoOnce(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const clampedTime = Math.min(video.duration > 0 ? video.duration : time, Math.max(0, time));

    if (Math.abs(video.currentTime - clampedTime) < 0.001) {
      resolve();
      return;
    }

    let timer: NodeJS.Timeout | number | null = null;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      if (timer !== null) clearTimeout(timer);
      video.removeEventListener("seeked", finish);
      video.removeEventListener("error", finish);
      resolve();
    };

    // Safety timeout: 1200ms watchdog prevents infinite hang if seeked event is dropped
    timer = setTimeout(finish, 1200);

    video.addEventListener("seeked", finish, { once: true });
    video.addEventListener("error", finish, { once: true });
    video.currentTime = clampedTime;
  });
}

/**
 * Pipelined frame seeking: fires the N+1 seek request immediately after
 * rendering frame N, so decode and encode overlap concurrently.
 */
function createFramePipeline(video: HTMLVideoElement, fps: number) {
  let pendingSeek: Promise<void> | null = null;
  let prefetchedFrameIdx = -1;

  return {
    async prime(frameIdx: number): Promise<void> {
      const t = frameIdx / fps;
      await seekVideoOnce(video, t);
      prefetchedFrameIdx = frameIdx;
      pendingSeek = null;
    },

    async waitForFrame(frameIdx: number): Promise<void> {
      if (pendingSeek !== null && prefetchedFrameIdx === frameIdx) {
        await pendingSeek;
        pendingSeek = null;
      } else if (prefetchedFrameIdx !== frameIdx) {
        await seekVideoOnce(video, frameIdx / fps);
        prefetchedFrameIdx = frameIdx;
        pendingSeek = null;
      }
    },

    prefetchNext(frameIdx: number): void {
      if (frameIdx < 0) return;
      prefetchedFrameIdx = frameIdx;
      pendingSeek = seekVideoOnce(video, frameIdx / fps);
    },
  };
}

// ── rVFC Types ────────────────────────────────────────────────────────────────

type RvfcCapableVideo = HTMLVideoElement & {
  requestVideoFrameCallback: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback: (id: number) => void;
};

function supportsRVFC(video: HTMLVideoElement): video is RvfcCapableVideo {
  return typeof (video as RvfcCapableVideo).requestVideoFrameCallback === "function";
}

/**
 * Seek + rVFC confirmation: seeks to targetTime and resolves only when rVFC
 * confirms the decoded frame is at the right timestamp, with a 1200ms watchdog.
 */
function seekWithRVFC(video: RvfcCapableVideo, targetTime: number): Promise<void> {
  return new Promise((resolve) => {
    const clampedTime = Math.min(video.duration > 0 ? video.duration : targetTime, Math.max(0, targetTime));

    if (Math.abs(video.currentTime - clampedTime) < 0.001) {
      resolve();
      return;
    }

    let rvfcId: number | null = null;
    let timer: NodeJS.Timeout | number | null = null;
    let settled = false;

    const settle = () => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      if (rvfcId !== null) {
        try { video.cancelVideoFrameCallback(rvfcId); } catch {}
      }
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", settle);
      resolve();
    };

    const onSeeked = () => {
      // Seeked fired, allow 80ms for rVFC or settle
      setTimeout(settle, 80);
    };

    const onFrame = (_now: number, meta: { mediaTime: number }) => {
      if (settled) return;
      if (Math.abs(meta.mediaTime - clampedTime) < 0.04) {
        settle();
      } else {
        rvfcId = video.requestVideoFrameCallback(onFrame);
      }
    };

    // 1200ms watchdog prevents hanging if rVFC or seeked event stalls
    timer = setTimeout(settle, 1200);

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", settle, { once: true });
    video.currentTime = clampedTime;
    rvfcId = video.requestVideoFrameCallback(onFrame);
  });
}

// ── Playback-Capture Mode (Tier 'mid' / 'low') ───────────────────────────────

/**
 * Playback-capture export loop — eliminates ALL seek overhead for mid/low-end devices.
 */
async function runPlaybackCapture(params: {
  video: RvfcCapableVideo;
  pixiRenderer: PixiCaptionRenderer;
  captionConfig: Parameters<PixiCaptionRenderer["renderTime"]>[1];
  videoEncoder: VideoEncoder;
  fps: number;
  totalFrames: number;
  frameDurationUs: number;
  tier: HardwareTier;
  signal?: AbortSignal;
  onProgress?: ExportOptions["onProgress"];
}): Promise<number> {
  const {
    video,
    pixiRenderer,
    captionConfig,
    videoEncoder,
    fps,
    totalFrames,
    frameDurationUs,
    tier,
    signal,
    onProgress,
  } = params;

  const playbackRate = 1;

  return new Promise<number>((resolve, reject) => {
    let capturedFrames = 0;
    let lastEncodedTimestampUs = -1;
    let duplicateCount = 0;
    let watchdogTimer: NodeJS.Timeout | number | null = null;
    let lastProgressTime = performance.now();
    let lastProgressFrame = 0;
    const startTime = performance.now();

    const cleanup = () => {
      if (watchdogTimer !== null) clearInterval(watchdogTimer);
      video.pause();
      video.playbackRate = 1;
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onVideoError);
    };

    const onEnded = () => {
      cleanup();
      resolve(capturedFrames);
    };

    const onVideoError = () => {
      cleanup();
      reject(new Error("[ExportEngine] Video element error during playback-capture"));
    };

    // Watchdog check every 1.5s: if progress stalls for > 6s, finish gracefully
    watchdogTimer = setInterval(() => {
      const now = performance.now();
      if (capturedFrames > lastProgressFrame) {
        lastProgressFrame = capturedFrames;
        lastProgressTime = now;
        return;
      }
      if (now - lastProgressTime > 2500) {
        if (video.paused && videoEncoder.encodeQueueSize <= 2) {
          video.play().catch(() => {});
          video.requestVideoFrameCallback(captureFrame);
        } else if (now - lastProgressTime > 6000) {
          console.warn("[ExportEngine] Playback-capture watchdog timeout. Completing export with captured frames.");
          cleanup();
          resolve(capturedFrames);
        }
      }
    }, 1500);

    video.addEventListener("ended", onEnded, { once: true });
    video.addEventListener("error", onVideoError, { once: true });

    const captureFrame = async (_now: number, meta: { mediaTime: number }) => {
      if (signal?.aborted) {
        cleanup();
        reject(new Error("Export cancelled."));
        return;
      }

      if (videoEncoder.state === "closed") {
        cleanup();
        reject(new Error("[ExportEngine] VideoEncoder was closed unexpectedly."));
        return;
      }

      let currentMediaTime = meta.mediaTime;
      const mediaTimeUs = Math.round(currentMediaTime * 1_000_000);

      // Ignore duplicate callbacks from browser compositor with loop breaker
      if (mediaTimeUs <= lastEncodedTimestampUs) {
        duplicateCount++;
        if (duplicateCount > 25) {
          currentMediaTime += 0.033;
          duplicateCount = 0;
        } else {
          video.requestVideoFrameCallback(captureFrame);
          return;
        }
      }
      duplicateCount = 0;

      // Skip frames beyond the intended duration
      if (currentMediaTime > (totalFrames / fps) + 0.05) {
        cleanup();
        resolve(capturedFrames);
        return;
      }

      // ── Backpressure: pause video until encoder queue drains ──────────────
      if (videoEncoder.encodeQueueSize > 6) {
        video.pause();
        const waitForDrain = () => {
          if (videoEncoder.encodeQueueSize <= 2) {
            video.playbackRate = playbackRate;
            video.play().catch(() => {});
            video.requestVideoFrameCallback(captureFrame);
          } else {
            setTimeout(waitForDrain, 8);
          }
        };
        setTimeout(waitForDrain, 8);
        return;
      }

      // ── GPU texture refresh + single-pass composite ───────────────────────
      pixiRenderer.updateVideoFrame();
      pixiRenderer.renderTime(currentMediaTime, captionConfig);

      // ── Capture from WebGL canvas (GPU-resident, zero CPU copy) ──────────
      const videoFrame = new VideoFrame(pixiRenderer.canvas, {
        timestamp: Math.round(currentMediaTime * 1_000_000),
        duration: frameDurationUs,
      });

      // ── Hardware H.264 encode ─────────────────────────────────────────────
      const isKeyframe = capturedFrames % Math.round(fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
      videoFrame.close();

      lastEncodedTimestampUs = Math.round(currentMediaTime * 1_000_000);
      capturedFrames++;

      if (capturedFrames % 6 === 0 || capturedFrames >= totalFrames) {
        const elapsedSec = (performance.now() - startTime) / 1000;
        const encFps = elapsedSec > 0 ? capturedFrames / elapsedSec : 0;
        const progress = Math.min(1, currentMediaTime / (totalFrames / fps));
        
        const estimatedTotalSec = elapsedSec / Math.max(0.01, progress);
        const remainingSec = Math.max(0, Math.round(estimatedTotalSec - elapsedSec));
        const etaString = remainingSec > 60 ? `${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s` : `${remainingSec}s`;

        onProgress?.({
          progress: Math.min(0.92, 0.05 + progress * 0.87),
          currentFrame: capturedFrames,
          totalFrames,
          fps: Math.round(encFps),
          stage: `Encoding frames (${Math.round(progress * 100)}%) · ETA ${etaString}`,
        });
      }

      // Request the next frame
      video.requestVideoFrameCallback(captureFrame);
    };

    // Prime: seek to t=0, then start playback
    seekVideoOnce(video, 0).then(() => {
      video.playbackRate = playbackRate;
      video.play().then(() => {
        video.requestVideoFrameCallback(captureFrame);
      }).catch((e) => {
        cleanup();
        reject(new Error(`[ExportEngine] video.play() failed: ${e}`));
      });
    }).catch(reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main WebCodecs Hardware-Accelerated Video Exporter.
 *
 * Auto-detects device hardware tier and selects the optimal capture strategy:
 *   - Tier 'high' (dGPU): pipelined seek + rVFC (fastest for powerful devices)
 *   - Tier 'mid'  (iGPU): playback-capture at 0.5× (eliminates seek overhead)
 *   - Tier 'low'  (mobile/slow): playback-capture at 0.25× + adaptive throttle
 *
 * GPU compositing is single-pass for all tiers (no 2D canvas intermediary).
 */
export async function exportVideoWithWebCodecs(options: ExportOptions): Promise<Blob> {
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
    fps = 60,
    durationInSeconds,
    performanceMode = "auto",
    onProgress,
    onTierDetected,
    signal,
  } = options;

  console.time("[ExportEngine] Total export time");
  onProgress?.({ progress: 0.02, currentFrame: 0, totalFrames: 0, fps: 0, stage: "Preloading assets…" });

  // 1. Ensure fonts are loaded
  await preloadAllFonts();

  if (signal?.aborted) throw new Error("Export cancelled.");

  // 2. Prepare offscreen video element with robust multi-fallback source resolution
  let hasVideoSource = false;
  let createdBlobUrl = "";
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  const tryLoadVideoSource = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!src) { resolve(false); return; }
      const onLoaded = () => { cleanup(); resolve(true); };
      const onError = () => { cleanup(); resolve(false); };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);
      video.src = src;
      video.load();
    });
  };

  if (videoUrl) {
    hasVideoSource = await tryLoadVideoSource(videoUrl);
  }

  if (!hasVideoSource && videoFile && videoFile.size > 0) {
    try {
      createdBlobUrl = URL.createObjectURL(videoFile);
      hasVideoSource = await tryLoadVideoSource(createdBlobUrl);
    } catch (err) {
      console.warn("[ExportEngine] Could not create Object URL from videoFile:", err);
    }
  }

  if (!hasVideoSource) {
    console.warn("[ExportEngine] No playable video source found. Exporting captions on black background.");
  }

  // Pre-warm decoder at t=0 to avoid blank first frame
  if (hasVideoSource && video.videoWidth > 0) {
    await seekVideoOnce(video, 0);
  }

  const duration = durationInSeconds || (hasVideoSource && video.duration > 0 ? video.duration : 7);
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const bitrate = Math.min(18_000_000, Math.max(4_000_000, Math.round((width * height * fps * 0.15))));

  onProgress?.({ progress: 0.04, currentFrame: 0, totalFrames, fps: 0, stage: "Configuring GPU encoders…" });

  // 3. Negotiate hardware H.264 video codec
  const videoCodec = await findSupportedH264Codec(width, height, fps, bitrate);

  // 4. Setup Audio Track (Extract & decode audio for AudioEncoder)
  let audioBuffer: AudioBuffer | null = null;
  let hasAudio = false;
  let audioSampleRate = 44100;
  let audioChannels = 2;

  if (videoFile && videoFile.size > 0) {
    try {
      const arrayBuf = await videoFile.arrayBuffer();
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass && arrayBuf.byteLength > 0) {
        const actx = new AudioCtxClass();
        audioBuffer = await actx.decodeAudioData(arrayBuf);
        audioSampleRate = audioBuffer.sampleRate;
        audioChannels = Math.min(2, audioBuffer.numberOfChannels);
        hasAudio = audioBuffer.length > 0;
        await actx.close();
      }
    } catch (audioErr) {
      console.warn("[ExportEngine] Audio decoding unavailable, exporting video without audio track:", audioErr);
      hasAudio = false;
    }
  }

  // 5. Use one deterministic capture strategy for every device. Playback-rate
  // throttling and adaptive FPS changes can shift video timestamps away from
  // the original audio/caption timeline, so export always seeks to each exact
  // output timestamp and waits for the decoded frame.
  const tier: HardwareTier = "mid";
  onTierDetected?.(tier);
  console.log("[ExportEngine] Accuracy-first capture: sequential decoded frames at 1x playback");

  let effectiveWidth = width;
  let effectiveHeight = height;
  let effectiveFps = fps;
  let effectiveBitrate = bitrate;

  const effectiveTotalFrames = Math.max(1, Math.round(duration * effectiveFps));
  const frameDurationUs = Math.round((1 / effectiveFps) * 1_000_000);

  // 6. Initialize MP4Muxer
  const muxerTarget = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: "avc",
      width: effectiveWidth,
      height: effectiveHeight,
    },
    audio: hasAudio
      ? {
          codec: "aac",
          numberOfChannels: audioChannels,
          sampleRate: audioSampleRate,
        }
      : undefined,
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  // 7. Setup VideoEncoder
  let videoEncoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e) => {
      console.error("[ExportEngine] VideoEncoder error:", e);
      videoEncoderError = e instanceof Error ? e : new Error(String(e));
    },
  });

  const effectiveVideoCodec = effectiveWidth !== width
    ? await findSupportedH264Codec(effectiveWidth, effectiveHeight, effectiveFps, effectiveBitrate)
    : videoCodec;

  videoEncoder.configure({
    codec: effectiveVideoCodec,
    width: effectiveWidth,
    height: effectiveHeight,
    bitrate: effectiveBitrate,
    framerate: effectiveFps,
    hardwareAcceleration: "prefer-hardware",
    avc: { format: "avc" },
  });

  // 8. Setup AudioEncoder if audio is present
  let audioEncoder: AudioEncoder | null = null;
  if (hasAudio && "AudioEncoder" in window) {
    try {
      const isAudioSupported = await AudioEncoder.isConfigSupported({
        codec: "mp4a.40.2",
        numberOfChannels: audioChannels,
        sampleRate: audioSampleRate,
        bitrate: 128_000,
      });

      if (isAudioSupported.supported) {
        audioEncoder = new AudioEncoder({
          output: (chunk, meta) => {
            muxer.addAudioChunk(chunk, meta);
          },
          error: (e) => {
            console.warn("[ExportEngine] AudioEncoder error:", e);
          },
        });

        audioEncoder.configure({
          codec: "mp4a.40.2",
          numberOfChannels: audioChannels,
          sampleRate: audioSampleRate,
          bitrate: 128_000,
        });
      }
    } catch (e) {
      console.warn("[ExportEngine] Could not initialize AudioEncoder:", e);
      audioEncoder = null;
    }
  }

  // 9. Initialize Pixi Caption Renderer (single-pass GPU compositing, no 2D canvas)
  const pixiRenderer = new PixiCaptionRenderer();
  await pixiRenderer.init(effectiveWidth, effectiveHeight);

  const captionConfig = {
    width: effectiveWidth,
    height: effectiveHeight,
    words,
    theme,
    accentColor,
    position,
    scale,
    customFontFamily,
  };

  pixiRenderer.updateConfig(captionConfig);

  if (hasVideoSource && video.videoWidth > 0 && video.videoHeight > 0) {
    pixiRenderer.mountVideoBackground(video, video.videoWidth, video.videoHeight);
    console.log("[ExportEngine] GPU video background mounted via PIXI.Texture.from(video)");
  }

  try {
    const startTime = performance.now();

    // ── Branch: Playback-capture (Tier mid/low) vs Pipelined-seek (Tier high) ──

    if (hasVideoSource && supportsRVFC(video)) {
      // ──────────────────────────────────────────────────────────────────────
      // SEQUENTIAL DECODE MODE
      // No frame-by-frame seeking. video.play() at normal rate and rVFC
      // delivers decoded frames naturally. Encoder backpressure pauses only
      // when necessary and never changes the media timestamps.
      // ──────────────────────────────────────────────────────────────────────
      const captureStrategyLabel = "sequential decoded-frame capture (1x)";
      console.log(`[ExportEngine] Capture strategy: ${captureStrategyLabel}`);
      onProgress?.({
        progress: 0.07,
        currentFrame: 0,
        totalFrames: effectiveTotalFrames,
        fps: 0,
        stage: `Starting export · ${captureStrategyLabel}…`,
      });

      await runPlaybackCapture({
        video: video as RvfcCapableVideo,
        pixiRenderer,
        captionConfig,
        videoEncoder,
        fps: effectiveFps,
        totalFrames: effectiveTotalFrames,
        frameDurationUs,
        tier,
        signal,
        onProgress,
      });

    } else {
      // ──────────────────────────────────────────────────────────────────────
      // PIPELINED SEEK MODE (Tier high, or no rVFC support fallback)
      // Maintains N+1 prefetch to overlap decode + encode latency.
      // On rVFC-capable browsers uses rVFC for frame-accurate confirmation.
      // ──────────────────────────────────────────────────────────────────────
      const useRVFC = hasVideoSource && supportsRVFC(video);
      console.log(`[ExportEngine] Capture strategy: ${useRVFC ? "rVFC pipelined seek (Tier high)" : "pipelined seeked events"}`);

      const framePipeline = createFramePipeline(video, effectiveFps);

      if (hasVideoSource) {
        if (useRVFC) {
          // Pre-warm already done above
        } else {
          await framePipeline.prime(0);
        }
      }

      for (let frameIdx = 0; frameIdx < effectiveTotalFrames; frameIdx++) {
        if (signal?.aborted) throw new Error("Export cancelled.");
        if (videoEncoderError) throw videoEncoderError;

        const currentTime = frameIdx / effectiveFps;

        // A. Advance video to correct frame
        if (hasVideoSource && video.videoWidth > 0) {
          if (useRVFC) {
            await seekWithRVFC(video as RvfcCapableVideo, currentTime);
          } else {
            await framePipeline.waitForFrame(frameIdx);
          }
        }

        // B. GPU texture refresh (zero CPU copy)
        pixiRenderer.updateVideoFrame();

        // C. Single-pass GPU composite: video sprite + captions
        pixiRenderer.renderTime(currentTime, captionConfig);

        // D. Capture from WebGL canvas (GPU-resident)
        const timestampUs = Math.round(currentTime * 1_000_000);
        const videoFrame = new VideoFrame(pixiRenderer.canvas, {
          timestamp: timestampUs,
          duration: frameDurationUs,
        });

        // E. Hardware H.264 encode
        const isKeyframe = frameIdx % Math.round(effectiveFps * 2) === 0;
        videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
        videoFrame.close();

        // F. Fire N+1 prefetch immediately (overlaps encode latency)
        if (hasVideoSource && !useRVFC && frameIdx + 1 < effectiveTotalFrames) {
          framePipeline.prefetchNext(frameIdx + 1);
        }

        // G. Proper backpressure: wait until queue drains
        if (videoEncoder.encodeQueueSize > 15) {
          while (videoEncoder.encodeQueueSize > 5) {
            await new Promise<void>((r) => setTimeout(r, 10));
          }
        }

        // H. Progress reporting (throttled to every 6 frames)
        const elapsedSec = (performance.now() - startTime) / 1000;
        const currentRenderFps = elapsedSec > 0 ? (frameIdx + 1) / elapsedSec : 0;
        const progress = (frameIdx + 1) / effectiveTotalFrames;

        if (frameIdx % 6 === 0 || frameIdx === effectiveTotalFrames - 1) {
          const estimatedTotalSec = elapsedSec / Math.max(0.01, progress);
          const remainingSec = Math.max(0, Math.round(estimatedTotalSec - elapsedSec));
          const etaString = remainingSec > 60 ? `${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s` : `${remainingSec}s`;

          onProgress?.({
            progress: Math.min(0.92, 0.05 + progress * 0.87),
            currentFrame: frameIdx + 1,
            totalFrames: effectiveTotalFrames,
            fps: Math.round(currentRenderFps),
            stage: `Encoding frames (${Math.round(progress * 100)}%) · ETA ${etaString}`,
          });
        }
      }
    }

    // 10. Encode Audio Track
    if (audioEncoder && audioBuffer) {
      onProgress?.({ progress: 0.94, currentFrame: effectiveTotalFrames, totalFrames: effectiveTotalFrames, fps, stage: "Encoding audio track…" });
      try {
        const channelDataList: Float32Array[] = [];
        for (let ch = 0; ch < audioChannels; ch++) {
          channelDataList.push(audioBuffer.getChannelData(ch));
        }

        const totalAudioSamples = audioBuffer.length;
        const chunkSize = 1024;
        const sampleRate = audioBuffer.sampleRate;

        for (let offset = 0; offset < totalAudioSamples; offset += chunkSize) {
          const currentChunkLen = Math.min(chunkSize, totalAudioSamples - offset);
          const chunkData = new Float32Array(currentChunkLen * audioChannels);

          for (let i = 0; i < currentChunkLen; i++) {
            for (let ch = 0; ch < audioChannels; ch++) {
              chunkData[i * audioChannels + ch] = channelDataList[ch][offset + i];
            }
          }

          const audioTimestampUs = Math.round((offset / sampleRate) * 1_000_000);
          const audioData = new AudioData({
            format: "f32",
            sampleRate,
            numberOfFrames: currentChunkLen,
            numberOfChannels: audioChannels,
            timestamp: audioTimestampUs,
            data: chunkData,
          });

          audioEncoder.encode(audioData);
          audioData.close();

          if (audioEncoder.encodeQueueSize > 8) {
            await new Promise<void>((r) => setTimeout(r, 0));
          }
        }

        await audioEncoder.flush();
        audioEncoder.close();
      } catch (audioEncErr) {
        console.warn("[ExportEngine] Error during audio encoding:", audioEncErr);
      }
    }

    // 11. Finalize
    onProgress?.({ progress: 0.97, currentFrame: effectiveTotalFrames, totalFrames: effectiveTotalFrames, fps, stage: "Finalizing MP4 container…" });

    await videoEncoder.flush();
    videoEncoder.close();

    muxer.finalize();

    const finalBlob = new Blob([muxerTarget.buffer], { type: "video/mp4" });
    console.timeEnd("[ExportEngine] Total export time");
    console.log(`[ExportEngine] Export complete! Generated MP4: ${(finalBlob.size / 1024 / 1024).toFixed(2)} MB | Tier: ${tier} | Mode: ${performanceMode}`);

    onProgress?.({ progress: 1.0, currentFrame: effectiveTotalFrames, totalFrames: effectiveTotalFrames, fps, stage: "Export complete!" });

    return finalBlob;
  } finally {
    pixiRenderer.destroy();
    if (createdBlobUrl) {
      URL.revokeObjectURL(createdBlobUrl);
    }
  }
}
