import React from "react";
import { spring, interpolate } from "remotion";
import { TemplateProps } from "./types";

/**
 * Snipcap Special — Kinetic Scene-Based Typography
 */

const CURSIVE = '"Celosia Nature", "Caveat", "Kalam", cursive';
const HERO    = '"Gilroy", "SF Pro Display", sans-serif';
const SMALL   = '"SF Pro Display", "Inter", sans-serif';

export const SnipcapSpecialTemplate: React.FC<TemplateProps> = React.memo(({
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
  const isDramatic = words.length >= 4;

  // ── SCENE B: plain inline reveal (≤3 words) ────────────────────────────────
  if (!isDramatic) {
    const spokenWords = words.filter((w) => time >= w.start);
    return (
      <div
        style={{
          fontFamily: customFontFamily || SMALL,
          fontSize: fontSize * 0.82,
          fontWeight: 700,
          color: "#ffffff",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.22em",
          maxWidth: width * 0.9,
          textAlign: "center",
          lineHeight: 1.2,
          textShadow: isPlaying ? "none" : "0 2px 8px rgba(0,0,0,0.7)",
        }}
      >
        {spokenWords.map((w, i) => (
          <span key={`plain-${w.word}-${i}`} style={{ display: "inline-block" }}>
            {w.word}
          </span>
        ))}
      </div>
    );
  }

  // ── SCENE A: dramatic 3-layer kinetic stack (≥4 words) ────────────────────

  // Pick hero word: the longest word in positions 1..n-2 (skip first and last)
  const middle = words.slice(1, words.length - 1);
  const heroWord = middle.reduce((best, w) =>
    w.word.length >= best.word.length ? w : best,
    middle[0],
  );
  const heroIdx = words.indexOf(heroWord);

  const topWords    = words.slice(0, heroIdx);
  const bottomWords = words.slice(heroIdx + 1);

  // Helper: spring-based blur-in for hero word
  const heroStartFrame = heroWord.start * fps;
  const heroAge = frame - heroStartFrame;
  const heroSpring = spring({
    frame: heroAge,
    fps,
    config: { mass: 0.6, damping: 14, stiffness: 180 },
    durationInFrames: 16,
  });
  const heroScale = interpolate(heroSpring, [0, 1], [0.75, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const heroOpacity = interpolate(heroSpring, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // blur goes from 10px → 0px as it reveals
  const heroBlur = interpolate(heroSpring, [0, 1], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const heroVisible = time >= heroWord.start;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        maxWidth: width * 0.88,
        textAlign: "center",
      }}
    >
      {/* TOP ROW — small cursive, words appear as spoken */}
      <div
        style={{
          fontFamily: customFontFamily || CURSIVE,
          fontSize: fontSize * 0.52,
          fontWeight: 400,
          color: "rgba(255,255,255,0.72)",
          letterSpacing: "0.01em",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.28em",
          textTransform: "lowercase",
          textShadow: isPlaying ? "none" : "0 2px 8px rgba(0,0,0,0.6)",
          minHeight: "1em",
        }}
      >
        {topWords
          .filter((w) => time >= w.start)
          .map((w, i) => {
            const wAge = frame - w.start * fps;
            const wSpring = spring({
              frame: wAge,
              fps,
              config: { mass: 0.4, damping: 18, stiffness: 200 },
              durationInFrames: 10,
            });
            const y = interpolate(wSpring, [0, 1], [10, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const op = interpolate(wSpring, [0, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <span
                key={`top-${w.word}-${i}`}
                style={{
                  display: "inline-block",
                  transform: `translateY(${y}px)`,
                  opacity: op,
                  willChange: "transform, opacity",
                }}
              >
                {w.word}
              </span>
            );
          })}
      </div>

      {/* HERO WORD — big, blur-in */}
      {heroVisible && (
        <div
          style={{
            fontFamily: customFontFamily || HERO,
            fontSize: fontSize * 1.55,
            fontWeight: 900,
            color: accentColor || "#30d158",
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            textShadow: isPlaying
              ? "none"
              : `0 0 18px ${accentColor || "#30d158"}55, 0 3px 14px rgba(0,0,0,0.75)`,
            transform: `scale(${heroScale})`,
            opacity: heroOpacity,
            filter: heroBlur > 0.8 ? `blur(${Math.round(heroBlur * 10) / 10}px)` : "none",
            willChange: "transform, opacity",
            lineHeight: 1.0,
          }}
        >
          {heroWord.word}
        </div>
      )}

      {/* BOTTOM ROW — small, plain inline as spoken */}
      <div
        style={{
          fontFamily: customFontFamily || SMALL,
          fontSize: fontSize * 0.5,
          fontWeight: 600,
          color: "rgba(255,255,255,0.6)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0.28em",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          textShadow: isPlaying ? "none" : "0 2px 8px rgba(0,0,0,0.6)",
          minHeight: "1em",
        }}
      >
        {bottomWords
          .filter((w) => time >= w.start)
          .map((w, i) => (
            <span key={`bottom-${w.word}-${i}`} style={{ display: "inline-block" }}>
              {w.word}
            </span>
          ))}
      </div>
    </div>
  );
});
SnipcapSpecialTemplate.displayName = "SnipcapSpecialTemplate";
