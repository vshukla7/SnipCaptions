/**
 * MinimalBlendTemplate — Minimalist Blend style
 *
 * Captions rendered in a neat, left-aligned block on the video:
 *   • Ultra-heavy Neue Haas Grotesk / Helvetica Neue typography
 *   • Smooth, eased spring slide-up animations (damping: 18)
 *   • Smart Hero / Key words rendered extra-large in UPPERCASE
 *   • Mix-blend-mode "difference" on Hero words to dynamically invert against video frames
 */

import React from "react";
import { spring, interpolate } from "remotion";
import type { TemplateProps } from "./types";

const DEFAULT_FONT = '"Neue Haas Grotesk Display Pro", "Helvetica Neue", "Syne", sans-serif';

export const MinimalBlendTemplate: React.FC<TemplateProps> = ({
  activeLine,
  frame,
  fps,
  width,
  fontSize,
  customFontFamily,
}) => {
  if (!activeLine || !activeLine.words.length) return null;

  const words = activeLine.words;

  // Pick the longest word in the line as the "isBig" keyword highlight
  const longestWord = words.reduce((best, w) =>
    w.word.length > best.word.length ? w : best,
    words[0],
  );

  const activeFont = customFontFamily || DEFAULT_FONT;

  // Dynamic scaling for font size configurations
  const normalSize = Math.round(fontSize * 0.9);   // ~62px
  const bigSize    = Math.round(fontSize * 1.6);   // ~110px

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        lineHeight: 0.82,
        letterSpacing: "-0.05em",
        fontFamily: activeFont,
        fontWeight: 900,
        maxWidth: width * 0.84,
        textAlign: "left",
      }}
    >
      {words.map((w, index) => {
        const wordStartFrame = Math.round(w.start * fps);
        const relFrame       = frame - wordStartFrame;
        const isSpoken       = relFrame >= 0;

        if (!isSpoken) return null;

        // ── Eased Smooth Slide-up Physics ─────────────────────────────────────
        const spr = spring({
          frame: relFrame,
          fps,
          config: {
            mass: 0.8,
            stiffness: 180,
            damping: 18, // Smooth ease without heavy bounce
          },
        });

        const translateY = interpolate(spr, [0, 1], [40, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = interpolate(spr, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Determine if word is highlighted as Big
        const isBig = (w as any).isBig ?? (w.word === longestWord.word);
        const wordSize = isBig ? bigSize : normalSize;
        const isBlendDifference = isBig;

        return (
          <span
            key={`minimal-word-${index}`}
            style={{
              display: "inline-block",
              transform: `translateY(${translateY}px)`,
              opacity,
              fontSize: wordSize,
              color: "#FFFFFF",
              // Mix-blend mode difference implementation
              mixBlendMode: isBlendDifference ? "difference" : "normal",
              textTransform: isBig ? "uppercase" : "capitalize",
              filter: "drop-shadow(0px 4px 12px rgba(0,0,0,0.5))",
              willChange: "transform, opacity",
              pointerEvents: "none",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
