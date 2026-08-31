import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Internals,
} from "remotion";
import { Video } from "@remotion/media";
import type { CaptionPosition, CaptionThemeId, Word } from "@/lib/types";

// Import separate template components
import { CleanTemplate } from "./templates/CleanTemplate";
import { NeonTemplate } from "./templates/NeonTemplate";
import { KineticTemplate } from "./templates/KineticTemplate";
import { HighlightTemplate } from "./templates/HighlightTemplate";
import { SnipcapSpecialTemplate } from "./templates/SnipcapSpecialTemplate";
import { BlackPunchTemplate } from "./templates/BlackPunchTemplate";
import { LiquidGlassTemplate } from "./templates/LiquidGlassTemplate";
import { OneWordTemplate } from "./templates/OneWordTemplate";
import { YellowScriptCaption } from "./templates/YellowScriptCaption";
import { Kinetic01Template } from "./templates/Kinetic01Template";
import { DualLineGlowTemplate } from "./templates/DualLineGlowTemplate";
import { PWEditsTemplate } from "./templates/PWEditsTemplate";
import { MrBeastTemplate } from "./templates/MrBeastTemplate";
import { MinimalBlendTemplate } from "./templates/MinimalBlendTemplate";
import { PremiereGlowTemplate } from "./templates/PremiereGlowTemplate";

export interface CaptionCompositionProps {
  src: string;
  words: Word[];
  theme: CaptionThemeId;
  accentColor: string;
  maxWordsPerLine?: number;
  position?: CaptionPosition;
  scale?: number;
  customFontFamily?: string | null;
  mutedVideo?: boolean;
}

interface Line {
  text: string;
  words: Word[];
  start: number;
  end: number;
}

function buildLines(words: Word[], maxWordsPerLine: number): Line[] {
  if (!words.length) return [];
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

const FONT_FOR_THEME: Record<CaptionThemeId, string> = {
  clean: '"SF Pro Display", "Inter", sans-serif',
  neon: '"Gilroy", "Outfit", sans-serif',
  kinetic: '"Gilroy", "Outfit", sans-serif',
  highlight: '"SF Pro Display", "Inter", sans-serif',
  snipcap_special: '"Gilroy", "SF Pro Display", sans-serif',
  black_punch: '"Helvetica Bold", "Impact", sans-serif',
  liquid_glass: '"Readex Pro", "Montserrat", sans-serif',
  one_word: '"SF Pro Display", "Inter", sans-serif',
  yellow_script: '"SF Pro Display", "Inter", sans-serif',
  kinetic_01: '"Gilroy", "Helvetica Neue", sans-serif',
  dual_line_glow: '"Gilroy", "Helvetica Neue", sans-serif',
  pw_edits: '"Montserrat", "Poppins", sans-serif',
  mr_beast: '"Bebas Neue", "Futura-Bold", "Impact", sans-serif',
  minimal_blend: '"Neue Haas Grotesk Display Pro", "Helvetica Neue", "Syne", sans-serif',
  premiere_glow: '"Neue Haas Grotesk Display Pro", "Helvetica Neue", "Syne", sans-serif',
};

// ─── Memoized Hardware-Accelerated Video Component ─────────────────────────────
const MemoizedVideo = React.memo<{ src: string; muted: boolean }>(({ src, muted }) => {
  if (!src || !src.trim()) {
    return (
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 80%, #1a1a2e 0%, #0d0d12 60%, #000000 100%)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: "8%",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px)",
            pointerEvents: "none",
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <Video
      src={src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        transform: "translate3d(0, 0, 0)",
        willChange: "transform",
        imageRendering: "pixelated",
      }}
      muted={muted}
    />
  );
});
MemoizedVideo.displayName = "MemoizedVideo";

// ─── Memoized Subtitle Canvas Wrapper ──────────────────────────────────────────
const MemoizedCanvasWrapper = React.memo<{
  position: CaptionPosition;
  scale: number;
  children: React.ReactNode;
}>(({ position, scale, children }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width: "90%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
});
MemoizedCanvasWrapper.displayName = "MemoizedCanvasWrapper";

// ─── Leaf Caption Overlay Component (Isolates Frame Updates) ───────────────────
const ActiveCaptionOverlay = React.memo<{
  words: Word[];
  theme: CaptionThemeId;
  accentColor: string;
  maxWordsPerLine: number;
  customFontFamily?: string | null;
  position: CaptionPosition;
  scale: number;
}>(({ words, theme, accentColor, maxWordsPerLine, customFontFamily, position, scale }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const time = frame / fps;

  let isPlaying = false;
  try {
    const [playing, , imperativePlaying] = Internals.Timeline.usePlayingState();
    isPlaying = Boolean(playing || (imperativePlaying && imperativePlaying.current));
  } catch {
    isPlaying = false;
  }

  const lines = useMemo(
    () => buildLines(words, maxWordsPerLine),
    [words, maxWordsPerLine],
  );

  const activeIndex = lines.findIndex(
    (l) => time >= l.start && time < l.end,
  );
  const activeLine = activeIndex >= 0 ? lines[activeIndex] : lines[lines.length - 1];

  const activeWordIdx = useMemo(() => {
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (time >= w.start && time < w.end) {
        return i;
      }
    }
    let lastIdx = 0;
    for (let i = 0; i < words.length; i++) {
      if (time >= words[i].end) {
        lastIdx = i;
      }
    }
    return lastIdx;
  }, [words, time]);

  const activeWord = words[activeWordIdx];

  const prevWordsStr = useMemo(() => {
    if (activeWordIdx <= 0) return "";
    const items = [];
    if (activeWordIdx > 1) items.push(words[activeWordIdx - 2].word);
    items.push(words[activeWordIdx - 1].word);
    return items.join(" ");
  }, [words, activeWordIdx]);

  const nextWordsStr = useMemo(() => {
    if (activeWordIdx >= words.length - 1) return "";
    const items = [];
    items.push(words[activeWordIdx + 1].word);
    if (activeWordIdx < words.length - 2) items.push(words[activeWordIdx + 2].word);
    return items.join(" ");
  }, [words, activeWordIdx]);

  const baseFont = customFontFamily || FONT_FOR_THEME[theme];
  const fontSize = Math.round(width * 0.062);

  const templateProps = {
    words,
    activeLine,
    activeWord,
    activeWordIdx,
    time,
    frame,
    fps,
    width,
    fontSize,
    accentColor,
    baseFont,
    prevWordsStr,
    nextWordsStr,
    customFontFamily,
    isPlaying,
  };

  if (theme === "yellow_script") {
    return (
      <YellowScriptCaption
        words={words}
        activeLine={activeLine}
        time={time}
        frame={frame}
        fps={fps}
        width={width}
        height={0}
        scale={scale}
        config={{
          placementY: position.y,
          topLineFont: '"Celosia Nature", "Caveat", "Kalam", cursive',
          topLineColor: accentColor || "#FFDC00",
          bottomLineFont: '"Gilroy", "SF Pro Display", sans-serif',
          bottomLineColor: "#FFFFFF",
          highlightColor: "#FF1E1E",
          spring: { mass: 0.5, damping: 12, stiffness: 200 },
        }}
      />
    );
  }

  let captionContent: React.ReactNode = null;

  if (theme === "clean") captionContent = <CleanTemplate {...templateProps} />;
  else if (theme === "neon") captionContent = <NeonTemplate {...templateProps} />;
  else if (theme === "kinetic") captionContent = <KineticTemplate {...templateProps} />;
  else if (theme === "highlight") captionContent = <HighlightTemplate {...templateProps} />;
  else if (theme === "snipcap_special") captionContent = <SnipcapSpecialTemplate {...templateProps} />;
  else if (theme === "black_punch") captionContent = <BlackPunchTemplate {...templateProps} />;
  else if (theme === "liquid_glass") captionContent = <LiquidGlassTemplate {...templateProps} />;
  else if (theme === "one_word") captionContent = <OneWordTemplate {...templateProps} />;
  else if (theme === "kinetic_01") captionContent = <Kinetic01Template {...templateProps} />;
  else if (theme === "dual_line_glow") captionContent = <DualLineGlowTemplate {...templateProps} />;
  else if (theme === "pw_edits") captionContent = <PWEditsTemplate {...templateProps} />;
  else if (theme === "mr_beast") captionContent = <MrBeastTemplate {...templateProps} />;
  else if (theme === "minimal_blend") captionContent = <MinimalBlendTemplate {...templateProps} />;
  else if (theme === "premiere_glow") captionContent = <PremiereGlowTemplate {...templateProps} />;

  return (
    <MemoizedCanvasWrapper position={position} scale={scale}>
      {captionContent}
    </MemoizedCanvasWrapper>
  );
});
ActiveCaptionOverlay.displayName = "ActiveCaptionOverlay";

// ─── Top-Level Composition Component (Isolated from frame ticks) ──────────────
export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
  src,
  words,
  theme,
  accentColor,
  maxWordsPerLine = 3,
  position = { x: 50, y: 80 },
  scale = 1.0,
  customFontFamily,
  mutedVideo = false,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <MemoizedVideo src={src} muted={mutedVideo} />
      <ActiveCaptionOverlay
        words={words}
        theme={theme}
        accentColor={accentColor}
        maxWordsPerLine={maxWordsPerLine}
        customFontFamily={customFontFamily}
        position={position}
        scale={scale}
      />
    </AbsoluteFill>
  );
};
