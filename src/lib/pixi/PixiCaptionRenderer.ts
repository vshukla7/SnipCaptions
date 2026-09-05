/**
 * Pixi.js (v8+) Hardware-Accelerated Caption Rendering Engine
 * Renders all animated caption themes directly on WebGL canvas
 * with sub-millisecond frame execution, spring physics, and dynamic text effects.
 *
 * GPU Video Compositing:
 *   - mountVideoBackground() uploads an HTMLVideoElement as a WebGL texture (PIXI.Texture.from).
 *   - updateVideoFrame() refreshes the GPU texture each frame with zero CPU readback.
 *   - unmountVideoBackground() tears down the sprite & texture.
 *   This eliminates the 2D-canvas intermediary and all GPU↔CPU round-trips during export.
 */

import { Application, Container, Sprite, Texture } from "pixi.js";
import type { CaptionPosition, CaptionThemeId, Word } from "../types";
import { preloadAllFonts } from "../fontLoader";
import { PIXI_THEMES } from "@/components/templates";

export interface CaptionRendererConfig {
  width: number;
  height: number;
  words: Word[];
  theme: CaptionThemeId;
  accentColor: string;
  position: CaptionPosition;
  scale: number;
  customFontFamily?: string | null;
  maxWordsPerLine?: number;
}

interface Line {
  text: string;
  words: Word[];
  start: number;
  end: number;
}

export function buildLines(words: Word[], maxWordsPerLine = 3): Line[] {
  if (!words || !words.length) return [];
  const lines: Line[] = [];
  let buffer: Word[] = [];

  const flush = () => {
    if (!buffer.length) return;
    lines.push({
      words: buffer,
      text: buffer.map((w) => w.word).join(" "),
      start: buffer[0].start,
      end: buffer[buffer.length - 1].end,
    });
    buffer = [];
  };

  for (const w of words) {
    buffer.push(w);
    if (buffer.length >= maxWordsPerLine) flush();
  }
  flush();
  return lines;
}

export const FONT_FOR_THEME: Record<CaptionThemeId, string> = {
  clean: "SF Pro Display, Inter, sans-serif",
  neon: "Gilroy, Outfit, sans-serif",
  kinetic: "Gilroy, Outfit, sans-serif",
  highlight: "SF Pro Display, Inter, sans-serif",
  snipcap_special: "Gilroy, SF Pro Display, sans-serif",
  black_punch: "Helvetica Bold, Impact, sans-serif",
  liquid_glass: "Readex Pro, Montserrat, sans-serif",
  one_word: "SF Pro Display, Inter, sans-serif",
  kinetic_01: "Gilroy, Helvetica Bold, sans-serif",
  dual_line_glow: "Gilroy, Helvetica Bold, sans-serif",
  minimal_blend: "Helvetica Bold, Syne, sans-serif",
  minimal_blur_blend: "Celosia Nature, Helvetica Bold, sans-serif",
  premiere_glow: "Helvetica Bold, Syne, sans-serif",
};

export class PixiCaptionRenderer {
  public app: Application | null = null;
  public canvas: HTMLCanvasElement;
  public rootContainer: Container | null = null;
  public captionContainer: Container | null = null;

  private width = 1080;
  private height = 1920;
  private currentConfig: CaptionRendererConfig | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  // ── GPU Video Background ─────────────────────────────────────────────────
  /** The sprite holding the video WebGL texture. Lives at z-index 0 in rootContainer. */
  private videoSprite: Sprite | null = null;
  /** The Pixi texture wrapping the HTMLVideoElement. Updated GPU-side each frame. */
  private videoTexture: Texture | null = null;
  // ─────────────────────────────────────────────────────────────────────────

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.canvas = canvas;
    } else {
      this.canvas = typeof document !== "undefined" ? document.createElement("canvas") : ({} as HTMLCanvasElement);
    }
  }

  public async init(width = 1080, height = 1920): Promise<void> {
    if (this.isInitialized && this.app) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      await preloadAllFonts();

      const maxDim = 4096;
      let targetW = width;
      let targetH = height;
      if (targetW > maxDim || targetH > maxDim) {
        const scale = maxDim / Math.max(targetW, targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }

      this.width = targetW;
      this.height = targetH;

      this.app = new Application();
      await this.app.init({
        canvas: this.canvas,
        width: this.width,
        height: this.height,
        backgroundAlpha: 0,
        resolution: 1,
        autoDensity: false,
        antialias: true,
        autoStart: false,
        preference: "webgl",
      });

      if (this.canvas) {
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.style.position = "absolute";
        this.canvas.style.top = "0";
        this.canvas.style.left = "0";
        this.canvas.style.pointerEvents = "none";
      }

      if (this.app.ticker) {
        this.app.ticker.stop();
        this.app.ticker.autoStart = false;
      }

      this.rootContainer = new Container();
      this.captionContainer = new Container();
      this.rootContainer.addChild(this.captionContainer);
      this.app.stage.addChild(this.rootContainer);

      const glCanvas = this.app.canvas;
      if (glCanvas && glCanvas.addEventListener) {
        glCanvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          console.warn("[PixiCaptionRenderer] WebGL Context Lost detected. Waiting for restore...");
        });
        glCanvas.addEventListener("webglcontextrestored", () => {
          console.log("[PixiCaptionRenderer] WebGL Context restored. Re-rendering stage.");
          if (this.currentConfig) {
            this.updateConfig(this.currentConfig);
          }
        });
      }

      this.isInitialized = true;

      if (this.currentConfig) {
        this.renderTime(0);
      }
    })();

    return this.initPromise;
  }

  public resize(width: number, height: number): void {
    if (!this.app || !this.isInitialized) return;
    const maxDim = 4096;
    let targetW = width;
    let targetH = height;
    if (targetW > maxDim || targetH > maxDim) {
      const s = maxDim / Math.max(targetW, targetH);
      targetW = Math.round(targetW * s);
      targetH = Math.round(targetH * s);
    }
    this.width = targetW;
    this.height = targetH;
    this.app.renderer.resize(targetW, targetH);
  }

  public updateConfig(config: CaptionRendererConfig): void {
    this.currentConfig = config;
    if (config.width !== this.width || config.height !== this.height) {
      this.resize(config.width, config.height);
    }
  }

  // ── GPU Video Background API ─────────────────────────────────────────────

  /**
   * Mounts an HTMLVideoElement as a GPU-resident background sprite at the bottom
   * of the Pixi stage (index 0, beneath all caption containers).
   *
   * PIXI.Texture.from(videoElement) creates a WebGL texture directly from the
   * video element — no CPU pixel readback, no 2D canvas intermediary.
   *
   * Call updateVideoFrame() each frame to refresh the GPU texture from the
   * current video frame position (also zero CPU-copy on hardware-accelerated browsers).
   *
   * @param videoEl     - The HTMLVideoElement to use as the background source.
   * @param videoW      - Native video width (pixels) for aspect-ratio letterboxing.
   * @param videoH      - Native video height (pixels) for aspect-ratio letterboxing.
   */
  public mountVideoBackground(videoEl: HTMLVideoElement, videoW: number, videoH: number): void {
    if (!this.app || !this.isInitialized || !this.rootContainer) return;

    // Tear down any pre-existing video sprite first
    this.unmountVideoBackground();

    // Create GPU texture from video element. Pixi v8 wraps it as a VideoSource internally.
    this.videoTexture = Texture.from(videoEl);

    this.videoSprite = new Sprite(this.videoTexture);

    // Letterbox: scale the sprite so it fills the canvas while preserving aspect ratio.
    const videoAspect = videoW / Math.max(videoH, 1);
    const canvasAspect = this.width / Math.max(this.height, 1);

    let spriteW: number;
    let spriteH: number;

    if (videoAspect > canvasAspect) {
      // Video is wider than canvas → pillarbox (fit height)
      spriteH = this.height;
      spriteW = this.height * videoAspect;
    } else {
      // Video is taller (or equal) → letterbox (fit width)
      spriteW = this.width;
      spriteH = this.width / videoAspect;
    }

    this.videoSprite.width = spriteW;
    this.videoSprite.height = spriteH;
    this.videoSprite.x = (this.width - spriteW) / 2;
    this.videoSprite.y = (this.height - spriteH) / 2;

    // Insert at position 0 so captions always render on top.
    this.rootContainer.addChildAt(this.videoSprite, 0);

    console.log(
      `[PixiCaptionRenderer] Video background mounted — GPU texture ${videoW}×${videoH} → sprite ${spriteW.toFixed(0)}×${spriteH.toFixed(0)} on ${this.width}×${this.height} canvas`,
    );
  }

  /**
   * Refreshes the GPU-side video texture from the current HTMLVideoElement frame.
   * This is a zero-CPU-copy operation on hardware-accelerated browsers — the browser
   * uploads the decoded video frame directly to the WebGL texture via texImage2D,
   * which in turn is handled by the GPU driver without touching the CPU heap.
   *
   * Must be called once per frame, immediately after the video has been seeked/decoded.
   */
  public updateVideoFrame(): void {
    if (!this.videoTexture || !this.videoSprite) return;

    // Pixi v8: texture.source holds the underlying TextureSource (VideoSource).
    // Calling update() signals Pixi to re-upload the video frame to WebGL on the next render.
    const src = this.videoTexture.source;
    if (src && typeof (src as { update?: () => void }).update === "function") {
      (src as { update: () => void }).update();
    }
  }

  /**
   * Removes and destroys the video background sprite & texture.
   * Safe to call even if no video background is currently mounted.
   */
  public unmountVideoBackground(): void {
    if (this.videoSprite) {
      if (this.rootContainer && this.rootContainer.children.includes(this.videoSprite)) {
        this.rootContainer.removeChild(this.videoSprite);
      }
      this.videoSprite.destroy({ texture: false }); // don't double-destroy the texture
      this.videoSprite = null;
    }
    if (this.videoTexture) {
      this.videoTexture.destroy(true);
      this.videoTexture = null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────

  public renderTime(time: number, config?: CaptionRendererConfig): void {
    if (config) {
      this.updateConfig(config);
    }
    const cfg = this.currentConfig;
    if (!this.app || !this.isInitialized || !this.captionContainer || !cfg) return;

    // If a video background sprite is mounted, refresh its GPU texture from the
    // current video element frame before compositing captions on top.
    this.updateVideoFrame();

    const { words, theme, accentColor, position, scale, customFontFamily, maxWordsPerLine = 3 } = cfg;

    this.captionContainer.removeChildren();

    if (!words || words.length === 0) {
      try { this.app.render(); } catch {}
      return;
    }

    const effectiveMaxWords = (theme === "minimal_blur_blend" || theme === "minimal_blend" || theme === "premiere_glow") ? 5 : (theme === "dual_line_glow" || theme === "snipcap_special") ? 7 : maxWordsPerLine;
    const lines = buildLines(words, effectiveMaxWords);
    if (!lines || lines.length === 0) {
      try { this.app.render(); } catch {}
      return;
    }

    let activeLine = lines.find((l) => time >= l.start && time < l.end);

    if (!activeLine) {
      for (let i = 0; i < lines.length; i++) {
        if (time >= lines[i].start && (i === lines.length - 1 || time < lines[i + 1].start)) {
          activeLine = lines[i];
          break;
        }
      }
    }

    if (!activeLine) {
      activeLine = time < lines[0].start ? lines[0] : lines[lines.length - 1];
    }

    let activeWordIdx = words.findIndex((w) => time >= w.start && time < w.end);
    if (activeWordIdx === -1) {
      for (let i = 0; i < words.length; i++) {
        if (time >= words[i].end) activeWordIdx = i;
      }
    }
    if (activeWordIdx === -1) {
      activeWordIdx = 0;
    }
    const activeWord = words[activeWordIdx] || words[0];

    const rawFont = customFontFamily || FONT_FOR_THEME[theme] || "SF Pro Display, sans-serif";
    const baseFont = rawFont.replace(/"/g, "");
    const baseFontSize = Math.round(this.width * 0.062);

    const centerX = (position.x / 100) * this.width;
    const centerY = (position.y / 100) * this.height;

    this.captionContainer.position.set(centerX, centerY);
    this.captionContainer.scale.set(scale);

    const renderFunc = PIXI_THEMES[theme] || PIXI_THEMES.clean;
    if (renderFunc) {
      renderFunc({
        words,
        activeLine,
        activeWord,
        activeWordIdx,
        time,
        frame: Math.round(time * 60),
        fps: 60,
        width: this.width,
        height: this.height,
        fontSize: baseFontSize,
        accentColor: accentColor || "#ffffff",
        baseFont,
        customFontFamily,
        container: this.captionContainer,
      });
    }

    // Prevent Left & Right edge cropping when scaled or with long text
    const maxSafeWidth = this.width * 0.90;
    const currentWidth = this.captionContainer.width;
    if (currentWidth > maxSafeWidth && currentWidth > 0) {
      const safeScale = scale * (maxSafeWidth / currentWidth);
      this.captionContainer.scale.set(safeScale);
    }

    try {
      this.app.render();
    } catch {
      /* gracefully handle context loss during fast-refresh */
    }
  }

  public destroy(): void {
    try {
      // Clean up video background resources before destroying the app
      this.unmountVideoBackground();

      if (this.app) {
        if (this.app.ticker) {
          this.app.ticker.stop();
        }
        this.app.destroy(false, { children: true });
        this.app = null;
      }
    } catch (e) {
      console.warn("[PixiCaptionRenderer] Warning during destroy:", e);
    }
    this.isInitialized = false;
    this.initPromise = null;
  }
}
