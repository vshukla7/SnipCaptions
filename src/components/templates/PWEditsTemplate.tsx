/**
 * PWEditsTemplate — PW Edits Style
 */

import React from "react";
import { spring, interpolate } from "remotion";
import type { TemplateProps } from "./types";

const TOP_FONT    = '"Montserrat", "Poppins", "Outfit", sans-serif';
const BOTTOM_FONT = '"Impact", "Bebas Neue", "Anton", sans-serif';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
    return `rgba(255, 0, 0, ${alpha})`;
  }
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length === 6) {
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

function adjustColorBrightness(hex: string, percent: number): string {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
    return hex;
  }
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length === 6) {
    let r = parseInt(c.substring(0, 2), 16);
    let g = parseInt(c.substring(2, 4), 16);
    let b = parseInt(c.substring(4, 6), 16);

    if (percent < 0) {
      r = Math.max(0, Math.floor(r * (1 + percent)));
      g = Math.max(0, Math.floor(g * (1 + percent)));
      b = Math.max(0, Math.floor(b * (1 + percent)));
    } else {
      r = Math.min(255, Math.floor(r + (255 - r) * percent));
      g = Math.min(255, Math.floor(g + (255 - g) * percent));
      b = Math.min(255, Math.floor(b + (255 - b) * percent));
    }

    const rHex = r.toString(16).padStart(2, "0");
    const gHex = g.toString(16).padStart(2, "0");
    const bHex = b.toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}`;
  }
  return hex;
}

export const PWEditsTemplate: React.FC<TemplateProps> = React.memo(({
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

  const splitAt    = words.length === 1 ? 1 : Math.ceil(words.length / 2);
  const topWords    = words.slice(0, splitAt);
  const bottomWords = words.slice(splitAt);

  const lineStartFrame = Math.round(activeLine.start * fps);
  const lineEndFrame   = Math.round(activeLine.end   * fps);
  const totalDuration  = Math.max(1, lineEndFrame - lineStartFrame);
  const currentProgress = Math.max(0, frame - lineStartFrame);

  const groupScale = interpolate(
    currentProgress,
    [0, totalDuration],
    [1.0, 1.08],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const activeAccent = accentColor || "#FF1E2A";
  const lightAccent = adjustColorBrightness(activeAccent, 0.15);
  const glowAccent = hexToRgba(activeAccent, 0.9);

  const topFont = customFontFamily || TOP_FONT;
  const bottomFont = customFontFamily || BOTTOM_FONT;

  const topSize    = Math.round(fontSize * 1.05);
  const bottomSize = Math.round(fontSize * 1.75);

  return (
    <div
      style={{
        transform: `scale(${groupScale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        textAlign: "center",
        maxWidth: width * 0.92,
        willChange: "transform",
      }}
    >
      {/* ── TOP LINE — Montserrat Bold / custom font, white ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          gap: "0.25em",
          fontFamily: topFont,
          fontWeight: 700,
          fontSize: topSize,
          color: "#FFFFFF",
          textShadow: isPlaying ? "none" : "0px 3px 6px rgba(0,0,0,0.9)",
          lineHeight: 1.15,
        }}
      >
        {topWords.map((w, i) => {
          const wordStartFrame = Math.round(w.start * fps);
          const relFrame       = frame - wordStartFrame;
          const isSpoken       = relFrame >= 0;

          const opacity = isSpoken
            ? interpolate(relFrame, [0, 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0;

          return (
            <span
              key={`pw-top-${i}`}
              style={{
                display: "inline-block",
                opacity,
                willChange: "opacity",
                pointerEvents: "none",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>

      {/* ── BOTTOM LINE — solid accent color, glow + stroke ── */}
      {bottomWords.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "baseline",
            gap: "0.18em",
            fontFamily: bottomFont,
            fontWeight: 900,
            fontSize: bottomSize,
            textTransform: "uppercase",
            letterSpacing: "-1px",
            lineHeight: 1.05,
          }}
        >
          {bottomWords.map((w, i) => {
            const wordStartFrame = Math.round(w.start * fps);
            const relFrame       = frame - wordStartFrame;
            const isSpoken       = relFrame >= 0;

            const spr = isSpoken
              ? spring({
                  frame: relFrame,
                  fps,
                  config: { damping: 14, stiffness: 110, mass: 0.7 },
                  durationInFrames: 22,
                })
              : 0;

            const translateY = interpolate(spr, [0, 1], [30, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const opacity = interpolate(spr, [0, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            const strokeShadow = [
              "-2px -2px 0 #000",
              " 2px -2px 0 #000",
              "-2px  2px 0 #000",
              " 2px  2px 0 #000",
            ];
            const glowShadow = [
              `0 0 18px ${glowAccent}`,
              `0 0 35px ${hexToRgba(activeAccent, 0.55)}`,
              `0 3px 8px rgba(0,0,0,0.8)`,
            ];
            const combinedShadow = isPlaying
              ? strokeShadow.join(",")
              : [...strokeShadow, ...glowShadow].join(",");

            return (
              <span
                key={`pw-bot-${i}`}
                style={{
                  display: "inline-block",
                  transform: `translateY(${translateY}px)`,
                  opacity,
                  color: lightAccent,
                  textShadow: combinedShadow,
                  willChange: "transform, opacity",
                  pointerEvents: "none",
                }}
              >
                {w.word.toUpperCase()}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
});
PWEditsTemplate.displayName = "PWEditsTemplate";
