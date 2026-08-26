/**
 * HighlightTemplate — Premium word-by-word highlight
 *
 * • All words pre-rendered (no layout shift)
 * • Active word: accent color + multi-layer glow bloom + subtle scale up
 * • Past words: bright white
 * • Unspoken words: dimmed and slightly smaller
 * • Smooth spring transition on each new word
 */
import React from "react";
import { spring, interpolate } from "remotion";
import { TemplateProps } from "./types";

export const HighlightTemplate: React.FC<TemplateProps> = ({
  activeLine,
  baseFont,
  fontSize,
  accentColor,
  width,
  frame,
  fps,
  time,
}) => {
  if (!activeLine) return null;

  const accent = accentColor || "#FFD60A";

  return (
    <div
      style={{
        fontFamily: baseFont,
        fontSize,
        fontWeight: 800,
        textAlign: "center",
        lineHeight: 1.25,
        maxWidth: width * 0.92,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "0.2em",
      }}
    >
      {activeLine.words.map((w, i) => {
        const isSpoken  = time >= w.start;
        const isCurrent = time >= w.start && time < w.end;
        const relFrame  = frame - Math.round(w.start * fps);

        // Spring for scale+glow on entry
        const entrySpring = isSpoken
          ? spring({ frame: relFrame, fps, config: { mass: 0.4, damping: 12, stiffness: 180 }, durationInFrames: 12 })
          : 0;

        const scale = isCurrent
          ? interpolate(entrySpring, [0, 1], [0.92, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : 1.0;

        const color = isCurrent
          ? accent
          : isSpoken
          ? "#FFFFFF"
          : "rgba(255,255,255,0.30)";

        const glowBloom = isCurrent
          ? `0 0 14px ${accent}, 0 0 32px ${accent}99, 0 0 60px ${accent}33, 0 3px 14px rgba(0,0,0,0.6)`
          : isSpoken
          ? "0 2px 10px rgba(0,0,0,0.5)"
          : "none";

        return (
          <span
            key={`${w.word}-${i}`}
            style={{
              display: "inline-block",
              color,
              textShadow: glowBloom,
              fontWeight: isCurrent ? 900 : isSpoken ? 800 : 700,
              transform: `scale(${scale})`,
              transition: "color 0.12s ease, text-shadow 0.18s ease",
              willChange: "transform",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
