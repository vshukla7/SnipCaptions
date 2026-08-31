/**
 * MinimalBlendTemplate — Minimalist Blend style
 */

import React from "react";
import { spring, interpolate } from "remotion";
import type { TemplateProps } from "./types";

const DEFAULT_FONT = '"Neue Haas Grotesk Display Pro", "Helvetica Neue", "Syne", sans-serif';

export const MinimalBlendTemplate: React.FC<TemplateProps> = React.memo(({
  activeLine,
  frame,
  fps,
  width,
  fontSize,
  customFontFamily,
  isPlaying,
}) => {
  if (!activeLine || !activeLine.words.length) return null;

  const words = activeLine.words;

  const longestWord = words.reduce((best, w) =>
    w.word.length > best.word.length ? w : best,
    words[0],
  );

  const activeFont = customFontFamily || DEFAULT_FONT;

  const normalSize = Math.round(fontSize * 0.9);
  const bigSize    = Math.round(fontSize * 1.6);

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

        const isBig = (w as any).isBig ?? (w.word === longestWord.word);
        const wordSize = isBig ? bigSize : normalSize;
        const isBlendDifference = isBig;

        return (
          <span
            key={`minimal-word-${index}`}
            style={{
              display: "inline-block",
              transform: `translateY(${translateY}px)`,
              opacity: isSpoken ? opacity : 0,
              visibility: isSpoken ? "visible" : "hidden",
              fontSize: wordSize,
              color: "#FFFFFF",
              mixBlendMode: isBlendDifference ? "difference" : "normal",
              textTransform: isBig ? "uppercase" : "capitalize",
              filter: isPlaying ? "none" : "drop-shadow(0px 4px 12px rgba(0,0,0,0.5))",
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
MinimalBlendTemplate.displayName = "MinimalBlendTemplate";
