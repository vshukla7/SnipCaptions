import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { PixiCaptionRenderer } from "./pixi/PixiCaptionRenderer";
import type { CaptionPosition, CaptionThemeId, Word } from "./types";
import { preloadAllFonts } from "./fontLoader";

export type ExportMethod = "playback" | "seek";

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
  /** Export method:
   * - 'playback' (default): 1x Real-Time stream capture (exact video duration, no seek latency)
   * - 'seek': Deterministic frame-by-frame seeking (100% exact frame timestamps)
   */
  exportMethod?: ExportMethod;
  onProgress?: (p: {
    progress: number;
    currentFrame: number;
    totalFrames: number;
    fps: number;
    stage: string;
  }) => void;
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

type RvfcCapableVideo = HTMLVideoElement & {
  requestVideoFrameCallback: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback: (id: number) => void;
};

function supportsRVFC(video: HTMLVideoElement): video is RvfcCapableVideo {
  return typeof (video as RvfcCapableVideo).requestVideoFrameCallback === "function";
}

function waitForNextVideoFrame(
  video: RvfcCapableVideo,
  timeoutMs = 600,
): Promise<{ mediaTime: number } | null> {
  return new Promise((resolve) => {
    let handleId: number | null = null;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (handleId !== null) video.cancelVideoFrameCallback(handleId);
      if (timer !== null) clearTimeout(timer);
      video.removeEventListener("ended", onEnded);
    };

    const onEnded = () => {
      cleanup();
      resolve(null);
    };

    handleId = video.requestVideoFrameCallback((_now, metadata) => {
      cleanup();
      resolve({ mediaTime: metadata.mediaTime });
    });

    timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    video.addEventListener("ended", onEnded, { once: true });
  });
}

/**
 * Fast, Stutter-Free Video Seeking for Offscreen WebGL Compositing.
 *
 * 1. Checks if video is already at the target timestamp.
 * 2. Sets video.currentTime = clampedTime.
 * 3. Waits for "seeked" event or resolves immediately if already current.
 * 4. Includes a 1500ms watchdog to ensure export never hangs.
 */
function seekVideoToTime(video: HTMLVideoElement, targetTime: number): Promise<void> {
  return new Promise((resolve) => {
    const duration = video.duration;
    const clampedTime = duration > 0 
      ? Math.min(Math.max(0, targetTime), Math.max(0, duration - 0.001))
      : Math.max(0, targetTime);

    // If currentTime is already virtually identical and video is ready and not seeking, resolve immediately
    if (Math.abs(video.currentTime - clampedTime) < 0.002 && !video.seeking && video.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      resolve();
    };

    // Watchdog: 1500ms max per seek to ensure export loop never hangs indefinitely
    timer = setTimeout(() => {
      cleanup();
      resolve();
    }, 1500);

    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });

    try {
      video.currentTime = clampedTime;
    } catch {
      cleanup();
      resolve();
    }
  });
}

/**
 * Main WebCodecs Hardware-Accelerated Video Exporter.
 *
 * Dual Mode Architecture:
 *   - 'playback': Real-time 1x stream capture via requestVideoFrameCallback (Speed = video duration)
 *   - 'seek': Deterministic frame-by-frame seeking (100% precision)
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
    exportMethod = "playback",
    onProgress,
    signal,
  } = options;

  console.time("[ExportEngine] Total export time");
  onProgress?.({ progress: 0.02, currentFrame: 0, totalFrames: 0, fps: 0, stage: "Preloading assets…" });

  // 1. Ensure fonts are loaded
  await preloadAllFonts();

  if (signal?.aborted) throw new Error("Export cancelled.");

  // 2. Prepare offscreen video element with multi-fallback source resolution
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
    await seekVideoToTime(video, 0);
  }

  const duration = durationInSeconds || (hasVideoSource && video.duration > 0 ? video.duration : 7);
  const totalFrames = Math.max(1, Math.round(duration * fps));
  const bitrate = options.bitrate || Math.min(18_000_000, Math.max(4_000_000, Math.round(width * height * fps * 0.15)));
  const frameDurationUs = Math.round((1 / fps) * 1_000_000);

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

  // 5. Initialize Pixi Caption Renderer (single-pass GPU compositing, no 2D canvas)
  const pixiRenderer = new PixiCaptionRenderer();
  await pixiRenderer.init(width, height);

  const captionConfig = {
    width,
    height,
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

  // 6. Initialize MP4Muxer
  const muxerTarget = new ArrayBufferTarget();
  const muxer = new Muxer({
    target: muxerTarget,
    video: {
      codec: "avc",
      width,
      height,
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

  // 7. Setup AudioEncoder if audio is present
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

  // 8. Setup VideoEncoder
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

  videoEncoder.configure({
    codec: videoCodec,
    width,
    height,
    bitrate,
    framerate: fps,
    hardwareAcceleration: "prefer-hardware",
    avc: { format: "avc" },
  });

  try {
    const startTime = performance.now();
    const usePlaybackMode = exportMethod === "playback" && hasVideoSource && supportsRVFC(video);

    console.log(
      `[ExportEngine] Starting export using ${usePlaybackMode ? "⚡ Fast Real-Time Playback (1x)" : "🎯 Frame-Accurate Seek"} mode (${totalFrames} frames @ ${fps}fps, ${width}x${height})`,
    );
    onProgress?.({
      progress: 0.07,
      currentFrame: 0,
      totalFrames,
      fps: 0,
      stage: `Starting export loop (${totalFrames} frames)…`,
    });

    if (usePlaybackMode) {
      // ── ⚡ Real-Time Playback Capture Loop ──────────────────────────────────
      await seekVideoToTime(video, 0);
      video.playbackRate = 1.0;

      let lastTimestampUs: number | null = null;
      let capturedFrameIdx = 0;

      try {
        await video.play();
      } catch (playErr) {
        console.warn("[ExportEngine] video.play() failed for playback strategy:", playErr);
      }

      while (true) {
        if (signal?.aborted) {
          video.pause();
          throw new Error("Export cancelled.");
        }
        if (videoEncoderError) {
          video.pause();
          throw videoEncoderError;
        }

        const frameInfo = await waitForNextVideoFrame(video as RvfcCapableVideo);
        if (!frameInfo) {
          break;
        }

        const mediaTime = frameInfo.mediaTime;
        if (mediaTime >= duration) {
          break;
        }

        const currentTimestampUs = Math.round(mediaTime * 1_000_000);
        const durationUs = lastTimestampUs !== null
          ? Math.max(1, currentTimestampUs - lastTimestampUs)
          : frameDurationUs;
        lastTimestampUs = currentTimestampUs;

        // GPU texture refresh (zero CPU copy)
        pixiRenderer.updateVideoFrame();

        // Single-pass GPU composite: video sprite + captions
        pixiRenderer.renderTime(mediaTime, captionConfig);

        // Capture GPU canvas into WebCodecs VideoFrame
        const videoFrame = new VideoFrame(pixiRenderer.canvas, {
          timestamp: currentTimestampUs,
          duration: durationUs,
        });

        // Hardware H.264 encode
        const isKeyframe = capturedFrameIdx % Math.round(fps * 2) === 0;
        videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
        videoFrame.close();

        capturedFrameIdx++;

        // Encoder backpressure management (pause video playback for backpressure)
        if (videoEncoder.encodeQueueSize > 12) {
          video.pause();
          let waitLoops = 0;
          while (videoEncoder.encodeQueueSize > 3 && waitLoops < 300) {
            if (signal?.aborted) throw new Error("Export cancelled.");
            if (videoEncoderError) throw videoEncoderError;
            await new Promise<void>((r) => setTimeout(r, 10));
            waitLoops++;
          }
          await video.play().catch(() => {});
        }

        // Throttled progress reporting
        if (capturedFrameIdx % 5 === 0 || mediaTime >= duration - 0.05) {
          const elapsedSec = (performance.now() - startTime) / 1000;
          const currentRenderFps = elapsedSec > 0 ? capturedFrameIdx / elapsedSec : 0;
          const progress = Math.min(1, mediaTime / duration);

          const estimatedTotalSec = elapsedSec / Math.max(0.01, progress);
          const remainingSec = Math.max(0, Math.round(estimatedTotalSec - elapsedSec));
          const etaString = remainingSec > 60 ? `${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s` : `${remainingSec}s`;

          onProgress?.({
            progress: Math.min(0.92, 0.05 + progress * 0.87),
            currentFrame: capturedFrameIdx,
            totalFrames,
            fps: Math.round(currentRenderFps),
            stage: `Encoding frames (${Math.round(progress * 100)}%) · ETA ${etaString}`,
          });
        }
      }

      video.pause();
    } else {
      // ── 🎯 Deterministic Frame-Accurate Seek Loop ────────────────────────────
      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (signal?.aborted) throw new Error("Export cancelled.");
        if (videoEncoderError) throw videoEncoderError;

        const currentTime = frameIdx / fps;

        // A. Advance video to exact timestamp and wait for GPU texture presentation
        if (hasVideoSource && video.videoWidth > 0) {
          await seekVideoToTime(video, currentTime);
        }

        // B. GPU texture refresh (zero CPU copy)
        pixiRenderer.updateVideoFrame();

        // C. Single-pass GPU composite: video sprite + captions
        pixiRenderer.renderTime(currentTime, captionConfig);

        // D. Capture GPU canvas into WebCodecs VideoFrame
        const timestampUs = Math.round(currentTime * 1_000_000);
        const videoFrame = new VideoFrame(pixiRenderer.canvas, {
          timestamp: timestampUs,
          duration: frameDurationUs,
        });

        // E. Hardware H.264 encode
        const isKeyframe = frameIdx % Math.round(fps * 2) === 0;
        videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
        videoFrame.close();

        // F. Safe encoder backpressure management (pauses JS loop, not video element)
        if (videoEncoder.encodeQueueSize > 12) {
          let waitLoops = 0;
          while (videoEncoder.encodeQueueSize > 3 && waitLoops < 300) {
            if (signal?.aborted) throw new Error("Export cancelled.");
            if (videoEncoderError) throw videoEncoderError;
            await new Promise<void>((r) => setTimeout(r, 10));
            waitLoops++;
          }
        }

        // G. Throttled progress reporting (every 5 frames)
        if (frameIdx % 5 === 0 || frameIdx === totalFrames - 1) {
          const elapsedSec = (performance.now() - startTime) / 1000;
          const currentRenderFps = elapsedSec > 0 ? (frameIdx + 1) / elapsedSec : 0;
          const progress = (frameIdx + 1) / totalFrames;

          const estimatedTotalSec = elapsedSec / Math.max(0.01, progress);
          const remainingSec = Math.max(0, Math.round(estimatedTotalSec - elapsedSec));
          const etaString = remainingSec > 60 ? `${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s` : `${remainingSec}s`;

          onProgress?.({
            progress: Math.min(0.92, 0.05 + progress * 0.87),
            currentFrame: frameIdx + 1,
            totalFrames,
            fps: Math.round(currentRenderFps),
            stage: `Encoding frames (${Math.round(progress * 100)}%) · ETA ${etaString}`,
          });
        }
      }
    }

    // 9. Encode Audio Track
    if (audioEncoder && audioBuffer) {
      onProgress?.({ progress: 0.94, currentFrame: totalFrames, totalFrames, fps, stage: "Encoding audio track…" });
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

    // 10. Finalize
    onProgress?.({ progress: 0.97, currentFrame: totalFrames, totalFrames, fps, stage: "Finalizing MP4 container…" });

    await videoEncoder.flush();
    videoEncoder.close();

    muxer.finalize();

    const finalBlob = new Blob([muxerTarget.buffer], { type: "video/mp4" });
    console.timeEnd("[ExportEngine] Total export time");
    console.log(`[ExportEngine] Export complete! Generated MP4: ${(finalBlob.size / 1024 / 1024).toFixed(2)} MB`);

    onProgress?.({ progress: 1.0, currentFrame: totalFrames, totalFrames, fps, stage: "Export complete!" });

    return finalBlob;
  } finally {
    pixiRenderer.destroy();
    if (createdBlobUrl) {
      URL.revokeObjectURL(createdBlobUrl);
    }
  }
}

