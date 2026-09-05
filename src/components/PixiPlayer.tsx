"use client";

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { PixiCaptionRenderer } from "@/lib/pixi/PixiCaptionRenderer";
import type { CaptionPosition, CaptionThemeId, Word } from "@/lib/types";
import { formatTime } from "@/lib/utils";

export interface PixiPlayerProps {
  src: string;
  words: Word[];
  theme: CaptionThemeId;
  accentColor: string;
  position: CaptionPosition;
  scale: number;
  customFontFamily?: string | null;
  durationInSeconds: number;
  naturalAspect?: number | null;
  onPositionClick?: () => void;
  className?: string;
}

export interface PixiPlayerRef {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (timeSeconds: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
}

export const PixiPlayer = forwardRef<PixiPlayerRef, PixiPlayerProps>(function PixiPlayer(
  {
    src,
    words,
    theme,
    accentColor,
    position,
    scale,
    customFontFamily,
    durationInSeconds,
    naturalAspect,
    onPositionClick,
    className = "",
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiCaptionRenderer | null>(null);

  const [isPlayingState, setIsPlayingState] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationInSeconds || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const animFrameIdRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  // Sync internal duration with props
  useEffect(() => {
    if (durationInSeconds > 0) {
      setDuration(durationInSeconds);
    }
  }, [durationInSeconds]);

  // Expose imperative player methods
  useImperativeHandle(ref, () => ({
    play: () => {
      if (videoRef.current) videoRef.current.play();
      else handlePlay();
    },
    pause: () => {
      if (videoRef.current) videoRef.current.pause();
      else handlePause();
    },
    togglePlay: () => togglePlayPause(),
    seekTo: (t: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = t;
      }
      setCurrentTime(t);
      rendererRef.current?.renderTime(t);
    },
    getCurrentTime: () => videoRef.current?.currentTime || currentTime,
    isPlaying: () => isPlayingState,
  }));

  // Initialize Pixi Caption Renderer
  useEffect(() => {
    let mounted = true;
    const container = canvasContainerRef.current;
    if (!container) return;

    const renderer = new PixiCaptionRenderer();
    rendererRef.current = renderer;

    const initRenderer = async () => {
      const w = 1080;
      const h = naturalAspect && naturalAspect > 1 ? Math.round(1080 / naturalAspect) : 1920;
      await renderer.init(w, h);
      if (!mounted || !canvasContainerRef.current) {
        renderer.destroy();
        return;
      }
      if (renderer.canvas) {
        renderer.canvas.style.width = "100%";
        renderer.canvas.style.height = "100%";
        renderer.canvas.style.position = "absolute";
        renderer.canvas.style.top = "0";
        renderer.canvas.style.left = "0";
        renderer.canvas.style.pointerEvents = "none";
        renderer.canvas.style.objectFit = "contain";
        canvasContainerRef.current.replaceChildren(renderer.canvas);
      }
      renderer.renderTime(videoRef.current?.currentTime || currentTime || 0, {
        width: w,
        height: h,
        words,
        theme,
        accentColor,
        position,
        scale,
        customFontFamily,
      });
    };

    initRenderer();

    return () => {
      mounted = false;
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
      if (canvasContainerRef.current) {
        canvasContainerRef.current.replaceChildren();
      }
    };
  }, []);

  // Update caption rendering config on prop change (without triggering re-runs on time ticks)
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const w = 1080;
    const h = naturalAspect && naturalAspect > 1 ? Math.round(1080 / naturalAspect) : 1920;

    renderer.updateConfig({
      width: w,
      height: h,
      words,
      theme,
      accentColor,
      position,
      scale,
      customFontFamily,
    });

    // Re-render current frame immediately (even when paused)
    const t = videoRef.current ? videoRef.current.currentTime : 0;
    renderer.renderTime(t);
  }, [words, theme, accentColor, position, scale, customFontFamily, naturalAspect]);

  const lastStateUpdateTimeRef = useRef<number>(0);

  // 60 FPS Animation & Caption Sync Loop
  const tick = useCallback((timestamp: DOMHighResTimeStamp) => {
    const video = videoRef.current;
    const renderer = rendererRef.current;

    if (video) {
      const time = video.currentTime;
      
      // Direct high-performance GPU caption render (zero React state overhead)
      if (renderer) {
        renderer.renderTime(time);
      }

      // Throttle React state updates during playback to ~10 FPS (every 100ms)
      // to eliminate main-thread CPU thrashing and frame drops on mobile devices.
      if (timestamp - lastStateUpdateTimeRef.current > 100) {
        lastStateUpdateTimeRef.current = timestamp;
        setCurrentTime(time);
      }

      if (!video.paused) {
        animFrameIdRef.current = requestAnimationFrame(tick);
      }
    } else {
      // Demo/preview mode with no video - manually advance time
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      const delta = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      setCurrentTime((prev) => {
        let newTime = prev + delta;
        if (duration > 0 && newTime >= duration) newTime = 0; // loop
        if (renderer) renderer.renderTime(newTime);
        return newTime;
      });

      animFrameIdRef.current = requestAnimationFrame(tick);
    }
  }, [duration]);

  const handlePlay = () => {
    setIsPlayingState(true);
    lastFrameTimeRef.current = null;
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(tick);
  };

  const handlePause = () => {
    setIsPlayingState(false);
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    const t = videoRef.current ? videoRef.current.currentTime : currentTime;
    setCurrentTime(t);
    rendererRef.current?.renderTime(t);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);
      rendererRef.current?.renderTime(t);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    rendererRef.current?.renderTime(newTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur > 0) setDuration(dur);
    }
  };

  const togglePlayPause = () => {
    const v = videoRef.current;
    if (v) {
      if (v.paused) v.play();
      else v.pause();
    } else {
      // Preview mode toggle
      if (isPlayingState) handlePause();
      else handlePlay();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlayingState) setShowControls(false);
    }, 2500);
  };

  const isLandscape = (naturalAspect || 1) > 1;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlayingState && setShowControls(false)}
      className={`group relative flex items-center justify-center overflow-hidden rounded-2xl bg-black select-none ${className}`}
      style={{
        aspectRatio: naturalAspect ? `${naturalAspect}` : "9/16",
        maxWidth: isLandscape ? "100%" : "380px",
        maxHeight: "100%",
        width: "100%",
        height: "100%",
      }}
    >
      {/* 1. Hardware-Accelerated Video Layer */}
      {src && src.trim() ? (
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="auto"
          loop
          onPlay={handlePlay}
          onPause={handlePause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedMetadata}
          onSeeked={handleTimeUpdate}
          onCanPlay={handleTimeUpdate}
          onClick={togglePlayPause}
          className="h-full w-full object-contain cursor-pointer"
          style={{
            transform: "translate3d(0,0,0)",
            willChange: "transform",
          }}
        />
      ) : (
        /* Demo Background Gradient */
        <div
          onClick={togglePlayPause}
          className="relative h-full w-full cursor-pointer bg-gradient-to-b from-[#1a1a2e] via-[#0d0d12] to-[#000000] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>
      )}

      {/* 2. Pixi.js WebGL Caption Canvas Overlay Container */}
      <div
        ref={canvasContainerRef}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      {/* 3. Interactive Caption Click Hotspot */}
      <div
        onClick={onPositionClick}
        title="Click to edit caption style and position"
        className="absolute z-20 cursor-pointer pointer-events-auto border border-dashed border-white/0 hover:border-white/40 transition-colors rounded-xl"
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: "80%",
          maxWidth: "360px",
          height: "68px",
        }}
      />

      {/* 4. Center Play/Pause Indicator (Overlay when paused) */}
      {!isPlayingState && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white/90 shadow-2xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95 z-30"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      {/* 5. Sleek Bottom Player Controls Bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 transition-opacity duration-300 ${
          showControls || !isPlayingState ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Scrubber */}
        {/* Timeline Scrubber with Blue Played Progress Bar */}
        <div className="relative flex items-center group/scrubber">
          {(() => {
            const progressPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
            return (
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 1}
                step={0.01}
                value={currentTime}
                onChange={handleSeek}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#2997FF] hover:h-2 transition-all"
                style={{
                  background: `linear-gradient(to right, #2997FF ${progressPct}%, rgba(255, 255, 255, 0.2) ${progressPct}%)`,
                }}
              />
            );
          })()}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between text-white/80">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="rounded-lg p-1 text-white hover:bg-white/10 transition-colors"
              title={isPlayingState ? "Pause" : "Play"}
            >
              {isPlayingState ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={toggleMute}
              className="rounded-lg p-1 hover:bg-white/10 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <span className="text-[11px] font-mono text-white/60">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
