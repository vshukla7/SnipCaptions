/**
 * MrBeastTemplate — MrBeast Style
 *
 * Big, bold, punchy uppercase captions:
 *   • Bebas Neue / Futura Bold font
 *   • Fast spring pop animation (scale 0.4 -> 1.25 -> 1.0)
 *   • Word-by-word yellow/accent highlight as spoken
 *   • Thick black stroke outline and solid retro black drop-shadow
 *   • Continuous slow group zoom camera push-in
 */

import React from "react";
import { spring, interpolate } from "remotion";
import type { TemplateProps } from "./types";

const DEFAULT_FONT = '"Bebas Neue", "Futura-Bold", "Impact", sans-serif';

export const MrBeastTemplate: React.FC<TemplateProps> = ({
  activeLine,
  frame,
  fps,
  width,
  fontSize,
  accentColor,
  customFontFamily,
}) => {
  if (!activeLine || !activeLine.words.length) return null;

  const words = activeLine.words;

  // ── Group scale: continuous slow camera push-in ────────────────────────────
  const lineStartFrame = Math.round(activeLine.start * fps);
  const lineEndFrame   = Math.round(activeLine.end   * fps);
  const totalDuration  = Math.max(1, lineEndFrame - lineStartFrame);
  const currentProgress = Math.max(0, frame - lineStartFrame);

  const groupScale = interpolate(
    currentProgress,
    [0, totalDuration],
    [1.0, 1.06],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Styling configuration ──────────────────────────────────────────────────
  const activeFont = customFontFamily || DEFAULT_FONT;
  const highlight = accentColor || "#FFE600";
  const size = Math.round(fontSize * 1.6); // MrBeast style is extra large

  return (
    <div
      style={{
        transform: `scale(${groupScale})`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "14px",
        maxWidth: width * 0.92,
        textAlign: "center",
        willChange: "transform",
      }}
    >
      {words.map((w, index) => {
        const wordStartFrame = Math.round(w.start * fps);
        const relFrame       = frame - wordStartFrame;
        const isSpoken       = relFrame >= 0;

        if (!isSpoken) return null;

        // ── Fast-to-slow Spring Pop Animation Physics ─────────────────────────
        const spr = spring({
          frame: relFrame,
          fps,
          config: {
            mass: 0.6,
            stiffness: 300, // Fast initial pop
            damping: 12,    // Smooth slowing down/settling
          },
        });

        // Scale: 0.4 -> 1.25 (Overshoot) -> 1.0 (Settles)
        const popScale = interpolate(spr, [0, 0.7, 1], [0.4, 1.25, 1.0], {
          extrapolateRight: "clamp",
        });

        const opacity = interpolate(spr, [0, 0.3], [0, 1], {
          extrapolateRight: "clamp",
        });

        // Highlight the currently spoken word
        const isCurrent = frame / fps >= w.start && frame / fps < w.end;
        const isYellowHighlight = (w as any).highlight || isCurrent;

        return (
          <span
            key={`mb-word-${index}`}
            style={{
              display: "inline-block",
              transform: `scale(${popScale})`,
              opacity,
              fontFamily: activeFont,
              fontWeight: 900,
              fontSize: size,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: isYellowHighlight ? highlight : "#FFFFFF",
              WebkitTextStroke: "3.5px #000000",
              // @ts-ignore
              paintOrder: "stroke fill",
              filter: "drop-shadow(4px 4px 0px #000000)",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
