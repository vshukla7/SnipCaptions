/**
 * MinimalBlurBlendTemplate — Minimalist Cursive & Blur Blend style
 *
 * Copy of MinimalBlendTemplate:
 *   • Small text: Celosia Nature script font
 *   • Big/Hero text: Helvetica Bold with spring blur-in animation
 *   • Big word color: Dynamically driven by side style panel accent color (default #2997FF blue)
 */

import React from "react";
import { spring, interpolate } from "remotion";
import type { TemplateProps } from "./types";

const BIG_FONT = '"Helvetica Bold", "Impact", sans-serif';
const SMALL_FONT = '"Celosia Nature", "Caveat", "Kalam", cursive';

export const MinimalBlurBlendTemplate: React.FC<TemplateProps> = React.memo(({
  activeLine,
  frame,
  fps,
  width,
  fontSize,
  accentColor,
  customFontFamily,
  isPlaying,
}) => {
  if (!activeLine || !activeLine.words.length) return null;

  const words = activeLine.words;

  const longestWord = words.reduce((best, w) =>
    w.word.length > best.word.length ? w : best,
    words[0],
  );

  const normalSize = Math.round(fontSize * 0.95);
  const bigSize    = Math.round(fontSize * 1.65);
  const heroColor  = accentColor || "#2997FF"; // Default blue (#2997FF), changes dynamically from side panel

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        lineHeight: 0.88,
        letterSpacing: "-0.04em",
        maxWidth: width * 0.88,
        textAlign: "left",
      }}
    >
      {words.map((w, index) => {
        const wordStartFrame = Math.round(w.start * fps);
        const relFrame       = frame - wordStartFrame;
        const isSpoken       = relFrame >= 0;

        const spr = spring({
          frame: isSpoken ? relFrame : 0,
          fps,
          config: {
            mass: 0.7,
            stiffness: 180,
            damping: 16,
          },
        });

        const translateY = interpolate(spr, [0, 1], [35, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = interpolate(spr, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const isBig = (w as any).isBig ?? (w.word === longestWord.word);
        const wordSize = isBig ? bigSize : normalSize;
        const font = isBig ? BIG_FONT : SMALL_FONT;

        // Big word spring blur-in animation (starts at 14px blur -> settles at 0px)
        const blurAmount = interpolate(spr, [0, 1], [14, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const filter = isBig && blurAmount > 0.8
          ? `blur(${Math.round(blurAmount * 10) / 10}px)`
          : "none";

        return (
          <span
            key={`minimal-blur-word-${index}`}
            style={{
              display: "inline-block",
              fontFamily: font,
              fontWeight: isBig ? 900 : 400,
              fontSize: wordSize,
              transform: `translateY(${translateY}px)`,
              opacity: isSpoken ? opacity : 0,
              visibility: isSpoken ? "visible" : "hidden",
              color: isBig ? heroColor : "rgba(255,255,255,0.85)",
              textShadow: isBig && !isPlaying ? `0 0 16px ${heroColor}66` : undefined,
              textTransform: isBig ? "uppercase" : "lowercase",
              filter,
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
});
MinimalBlurBlendTemplate.displayName = "MinimalBlurBlendTemplate";
