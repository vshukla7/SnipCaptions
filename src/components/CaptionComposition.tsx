import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { CaptionPosition, CaptionThemeId, Word } from "@/lib/types";

export interface CaptionCompositionProps {
  src: string;
  words: Word[];
  theme: CaptionThemeId;
  accentColor: string;
  maxWordsPerLine?: number;
  position?: CaptionPosition;
  scale?: number;
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
  clean: '"Inter", sans-serif',
  neon: '"Outfit", "Poppins", sans-serif',
  kinetic: '"Outfit", "Poppins", sans-serif',
  highlight: '"Inter", sans-serif',
};

export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
  src,
  words,
  theme,
  accentColor,
  maxWordsPerLine = 3,
  position = { x: 50, y: 80 },
  scale = 1.0,
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

  const baseFont = FONT_FOR_THEME[theme];
  const fontSize = Math.round(width * 0.062);

  const renderWords = (
    lineWords: Word[],
    opts: { highlightSpoken: boolean; bounce: boolean },
  ) =>
    lineWords.map((w, i) => {
      const spoken = time >= w.start;
      const justStarted = time >= w.start && time < w.end;

      let transform = "translateY(0px) scale(1)";
      let color = "#ffffff";
      let textShadow = "0 2px 12px rgba(0,0,0,0.55)";

      if (theme === "neon") {
        color = "#ffffff";
        textShadow = `0 0 8px ${accentColor}, 0 0 22px ${accentColor}, 0 2px 10px rgba(0,0,0,0.6)`;
      }

      if (opts.bounce) {
        const appearFrame = w.start * fps;
        const s = spring({
          frame: frame - appearFrame,
          fps,
          config: { damping: 11, stiffness: 140, mass: 0.6 },
          durationInFrames: 18,
        });
        const scale = interpolate(s, [0, 1], [0.55, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const y = interpolate(s, [0, 1], [34, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        transform = `translateY(${y}px) scale(${scale})`;
        color = justStarted ? accentColor : "#ffffff";
      }

      if (opts.highlightSpoken) {
        color = spoken ? accentColor : "rgba(255,255,255,0.55)";
        if (justStarted) {
          const pulse = spring({
            frame: frame - w.start * fps,
            fps,
            config: { damping: 14, stiffness: 120 },
            durationInFrames: 14,
          });
          const glow = interpolate(pulse, [0, 1], [0, 10], {
            extrapolateRight: "clamp",
          });
          textShadow = `0 0 ${glow}px ${accentColor}, 0 2px 10px rgba(0,0,0,0.6)`;
        }
      }

      return (
        <span
          key={`${w.word}-${i}`}
          style={{
            display: "inline-block",
            color,
            transform,
            textShadow,
            margin: "0 0.18em",
            fontWeight: 800,
            willChange: "transform",
          }}
        >
          {w.word}
        </span>
      );
    });

  let captionContent: React.ReactNode = null;

  if (theme === "clean" && activeLine) {
    captionContent = (
      <div
        style={{
          fontFamily: baseFont,
          fontSize,
          fontWeight: 800,
          color: "#ffffff",
          textAlign: "center",
          lineHeight: 1.15,
          textShadow: "0 2px 14px rgba(0,0,0,0.6)",
          maxWidth: width * 0.9,
        }}
      >
        {activeLine.words.map((w, i) => (
          <span key={`${w.word}-${i}`} style={{ margin: "0 0.16em" }}>
            {w.word}
          </span>
        ))}
      </div>
    );
  } else if (theme === "neon" && activeLine) {
    captionContent = (
      <div
        style={{
          fontFamily: baseFont,
          fontSize,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          textAlign: "center",
          lineHeight: 1.1,
          textShadow: `0 0 8px ${accentColor}, 0 0 22px ${accentColor}, 0 2px 10px rgba(0,0,0,0.6)`,
          color: "#ffffff",
          maxWidth: width * 0.9,
        }}
      >
        {activeLine.words.map((w, i) => (
          <span key={`${w.word}-${i}`} style={{ margin: "0 0.16em" }}>
            {w.word}
          </span>
        ))}
      </div>
    );
  } else if (theme === "kinetic" && activeLine) {
    captionContent = (
      <div
        style={{
          fontFamily: baseFont,
          fontSize,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: width * 0.92,
        }}
      >
        {renderWords(activeLine.words, { highlightSpoken: false, bounce: true })}
      </div>
    );
  } else if (theme === "highlight" && activeLine) {
    captionContent = (
      <div
        style={{
          fontFamily: baseFont,
          fontSize,
          fontWeight: 800,
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: width * 0.92,
        }}
      >
        {renderWords(activeLine.words, { highlightSpoken: true, bounce: false })}
      </div>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <Video
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
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
