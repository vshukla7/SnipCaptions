/**
 * DualLineGlowTemplate — Retro Duo style
 */

import React from "react";
import { spring, interpolate } from "remotion";
import { TemplateProps } from "./types";

const TOP_FONT    = '"Impact", "Bebas Neue", "NCL Gasdrifo", sans-serif';
const BOTTOM_FONT = '"Longmile", "Dancing Script", "Caveat", "Celosia Nature", cursive';

export const DualLineGlowTemplate: React.FC<TemplateProps> = React.memo(({
  activeLine,
  time,
  frame,
  fps,
  width,
  fontSize,
  accentColor,
  customFontFamily,
  isPlaying,
}) => {
  if (!activeLine) return null;

  const words = activeLine.words;
  if (!words.length) return null;

  const splitAt    = words.length === 1 ? 1 : Math.ceil(words.length / 2);
  const topWords    = words.slice(0, splitAt);
  const bottomWords = words.slice(splitAt);

  const topFont    = customFontFamily || TOP_FONT;
  const bottomFont = customFontFamily || BOTTOM_FONT;
  const topSize    = fontSize * 1.15;
  const bottomSize = fontSize * 0.75;
  const glowColor  = accentColor || "#FFD700";
  const shadowBase = "0 2px 10px rgba(0,0,0,0.8)";
  const bottomShadowBase = "0 1px 5px rgba(0,0,0,0.5)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
        maxWidth: width * 0.92,
        textAlign: "center",
      }}
    >
      {/* ─── TOP LINE — always render all words, fade-in only ─── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          gap: "0.22em",
          lineHeight: 1.1,
        }}
      >
        {topWords.map((w, i) => {
          const wordStartFrame = Math.round(w.start * fps);
          const relFrame       = frame - wordStartFrame;
          const isSpoken       = relFrame >= 0;
          const isCurrent      = time >= w.start && time < w.end;

          const scaleSpring = isSpoken
            ? spring({
                frame: relFrame,
                fps,
                config: { damping: 12, stiffness: 200, mass: 0.5 },
                durationInFrames: 6,
              })
            : 0;
          
          const scale = isSpoken
            ? interpolate(scaleSpring, [0, 1], [0.85, 1.0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0.85;

          const opacity = isSpoken
            ? interpolate(relFrame, [0, 4], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0;

          // Intense outer glow when active (disabled during playback)
          const glowBloom = isPlaying
            ? "none"
            : isCurrent
            ? `0 0 10px rgba(255, 200, 0, 0.7), 0 0 20px rgba(255, 200, 0, 0.5)`
            : isSpoken
            ? `0 0 5px rgba(255, 200, 0, 0.3)`
            : "none";

          return (
            <span
              key={`top-${w.word}-${i}`}
              style={{
                display: "inline-block",
                fontFamily: topFont,
                fontSize: topSize,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                color: isSpoken
                  ? isCurrent ? glowColor : "#FFFFFF"
                  : "transparent",
                textShadow: glowBloom !== "none"
                  ? `${glowBloom}, ${shadowBase}`
                  : isPlaying ? "none" : shadowBase,
                opacity,
                transform: `scale(${scale})`,
                transition: "color 0.15s ease, text-shadow 0.22s ease",
                willChange: "transform, opacity",
                pointerEvents: "none",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>

      {/* ─── BOTTOM LINE — always rendered, spring slide-up per word ─── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          gap: "0.24em",
          lineHeight: 1.2,
          minHeight: bottomWords.length === 0 ? 0 : bottomSize * 1.4,
        }}
      >
        {bottomWords.map((w, i) => {
          const wordStartFrame = Math.round(w.start * fps);
          const relFrame       = frame - wordStartFrame;
          const isSpoken       = relFrame >= 0;

          const slideSpring = isSpoken
            ? spring({
                frame: relFrame,
                fps,
                config: { mass: 0.4, damping: 14, stiffness: 180 },
                durationInFrames: 10,
              })
            : 0;

          const ty = interpolate(slideSpring, [0, 1], [18, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const op = interpolate(slideSpring, [0, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <span
              key={`bot-${w.word}-${i}`}
              style={{
                display: "inline-block",
                fontFamily: bottomFont,
                fontSize: bottomSize,
                fontWeight: 500,
                textTransform: "lowercase",
                color: isSpoken ? "#E0E0E0" : "transparent",
                textShadow: isPlaying ? "none" : isSpoken ? bottomShadowBase : "none",
                opacity: op,
                transform: `translateY(${ty}px)`,
                willChange: "transform, opacity",
                pointerEvents: "none",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
});
DualLineGlowTemplate.displayName = "DualLineGlowTemplate";
