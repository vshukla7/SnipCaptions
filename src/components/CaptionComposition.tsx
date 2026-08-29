import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
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

export interface CaptionCompositionProps {
  src: string;
  words: Word[];
  theme: CaptionThemeId;
  accentColor: string;
  maxWordsPerLine?: number;
  position?: CaptionPosition;
  scale?: number;
  customFontFamily?: string | null;
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
};

export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
  src,
  words,
  theme,
  accentColor,
  maxWordsPerLine = 3,
  position = { x: 50, y: 80 },
  scale = 1.0,
  customFontFamily,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const time = frame / fps;

  const lines = useMemo(
    () => buildLines(words, maxWordsPerLine),
    [words, maxWordsPerLine],
  );

  const activeIndex = lines.findIndex(
    (l) => time >= l.start && time < l.end,
  );
  const activeLine = activeIndex >= 0 ? lines[activeIndex] : lines[lines.length - 1];

  // Calculate active word index and neighboring words for dynamic context stack
  const activeWordIdx = useMemo(() => {
    // 1. Check if there's an exact match
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (time >= w.start && time < w.end) {
        return i;
      }
    }
    // 2. If not, find the last word that has ended before the current time
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

  // Debug: log mount + sparse active-line changes (avoids per-frame spam).
  const mounted = React.useRef(false);
  const lastLine = React.useRef(-1);
  if (!mounted.current) {
    mounted.current = true;
    console.log("[SnipCaptions:caption] mount · theme=", theme, "lines=", lines.length, "fps=", fps, "width=", width);
  }
  if (activeIndex !== lastLine.current) {
    lastLine.current = activeIndex;
    console.log("[SnipCaptions:caption] frame=", frame, "time=", time.toFixed(2) + "s", "activeLine=", activeIndex, activeLine ? `→ "${activeLine.text}"` : "");
  }

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
  };

  let captionContent: React.ReactNode = null;

  if (theme === "clean") {
    captionContent = <CleanTemplate {...templateProps} />;
  } else if (theme === "neon") {
    captionContent = <NeonTemplate {...templateProps} />;
  } else if (theme === "kinetic") {
    captionContent = <KineticTemplate {...templateProps} />;
  } else if (theme === "highlight") {
    captionContent = <HighlightTemplate {...templateProps} />;
  } else if (theme === "snipcap_special") {
    captionContent = <SnipcapSpecialTemplate {...templateProps} />;
  } else if (theme === "black_punch") {
    captionContent = <BlackPunchTemplate {...templateProps} />;
  } else if (theme === "liquid_glass") {
    captionContent = <LiquidGlassTemplate {...templateProps} />;
  } else if (theme === "one_word") {
    captionContent = <OneWordTemplate {...templateProps} />;
  } else if (theme === "yellow_script") {
    // YellowScriptCaption handles its own absolute positioning internally
    return (
      <AbsoluteFill style={{ backgroundColor: "#000000" }}>
        {Boolean(src && src.trim()) ? (
          <Video
            src={src}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <AbsoluteFill style={{ backgroundColor: "#121214", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif", fontSize: 24, textAlign: "center" }}>
              Studio Demo Preview Mode
            </div>
          </AbsoluteFill>
        )}
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
      </AbsoluteFill>
    );
  } else if (theme === "kinetic_01") {
    captionContent = <Kinetic01Template {...templateProps} />;
  } else if (theme === "dual_line_glow") {
    captionContent = <DualLineGlowTemplate {...templateProps} />;
  } else if (theme === "pw_edits") {
    captionContent = <PWEditsTemplate {...templateProps} />;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {Boolean(src && src.trim()) ? (
        <Video
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <AbsoluteFill
          style={{
            background: "radial-gradient(ellipse at 50% 80%, #1a1a2e 0%, #0d0d12 60%, #000000 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: "8%",
          }}
        >
          {/* Subtle noise texture via repeating gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px)",
              pointerEvents: "none",
            }}
          />
        </AbsoluteFill>
      )}
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
        {captionContent}
      </div>
    </AbsoluteFill>
  );
};
