/**
 * PremiereGlowTemplate — Premiere Pro styled glow captions
 *
 * Captions rendered in a neat, left-aligned block on the video:
 *   • Ultra-heavy Neue Haas Grotesk / Helvetica Neue typography
 *   • Pre-rendered layout structure (no layout shift/word jumping)
 *   • Smooth, eased spring slide-up animations
 *   • The biggest (hero) word is highlighted in UPPERCASE, styled with a
 *     vibrant Premiere Pro-style text gradient and multi-layered neon glow.
 */

import React from "react";
import { spring, interpolate } from "remotion";
import type { TemplateProps } from "./types";

const DEFAULT_FONT = '"Neue Haas Grotesk Display Pro", "Helvetica Neue", "Syne", sans-serif';

export const PremiereGlowTemplate: React.FC<TemplateProps> = ({
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

  // Pick the longest word in the line as the "isBig" keyword highlight
  const longestWord = words.reduce((best, w) =>
    w.word.length > best.word.length ? w : best,
    words[0],
  );

  const activeFont = customFontFamily || DEFAULT_FONT;
  const accent = accentColor || "#FFE600"; // Premiere Pro gold accent

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

        // ── Eased Smooth Slide-up Physics ─────────────────────────────────────
        const spr = spring({
          frame: isSpoken ? relFrame : 0,
          fps,
          config: {
            mass: 0.8,
            stiffness: 180,
            damping: 18,
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

        // Premiere Pro styled gradient and glow configuration
        const gradientBackground = isBig
          ? `linear-gradient(135deg, #FFF9C4 0%, ${accent} 50%, #FF3D00 100%)`
          : undefined;

        const glowFilter = isBig
          ? `drop-shadow(0px 0px 8px ${accent}) drop-shadow(0px 0px 24px #FF3D00) drop-shadow(0px 4px 12px rgba(0,0,0,0.6))`
          : "drop-shadow(0px 4px 12px rgba(0,0,0,0.5))";

        return (
          <span
            key={`premiere-word-${index}`}
            style={{
              display: "inline-block",
              transform: `translateY(${translateY}px)`,
              opacity: isSpoken ? opacity : 0,
              visibility: isSpoken ? "visible" : "hidden",
              fontSize: wordSize,
              color: isBig ? "transparent" : "#FFFFFF",
              backgroundImage: gradientBackground,
              backgroundClip: isBig ? "text" : undefined,
              WebkitBackgroundClip: isBig ? "text" : undefined,
              WebkitTextFillColor: isBig ? "transparent" : undefined,
              textTransform: isBig ? "uppercase" : "capitalize",
              filter: glowFilter,
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
