/**
 * LiquidGlassTemplate — Premium glassmorphism pill
 *
 * • Frosted glass pill badge with multi-layer blur + border
 * • Active word: accent, bold, slightly larger with glow
 * • Past words: white
 * • Unspoken: dim, all pre-rendered for stable layout
 * • Pill entrance: fade+slide-up when line changes
 */
import React from "react";
import { spring, interpolate } from "remotion";
import { TemplateProps } from "./types";

export const LiquidGlassTemplate: React.FC<TemplateProps> = ({
  activeLine,
  fontSize,
  accentColor,
  width,
  time,
  frame,
  fps,
  customFontFamily,
}) => {
  if (!activeLine) return null;

  const activeFont   = customFontFamily || '"Helvetica Rounded", "SF Pro Display", sans-serif';
  const contextFont  = customFontFamily || '"Readex Pro", "Inter", sans-serif';
  const accent       = accentColor || "#00E5FF";

  // Pill entrance spring — triggers each time activeLine changes (keyed by line start)
  const lineStartFrame = Math.round(activeLine.start * fps);
  const lineAge        = frame - lineStartFrame;
  const pillSpring     = spring({
    frame: Math.max(0, lineAge),
    fps,
    config: { mass: 0.5, damping: 16, stiffness: 160 },
    durationInFrames: 16,
  });

  const pillOpacity = interpolate(pillSpring, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pillY       = interpolate(pillSpring, [0, 1], [22, 0],  { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        opacity: pillOpacity,
        transform: `translateY(${pillY}px)`,
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          fontFamily: contextFont,
          fontSize: fontSize * 0.76,
          textAlign: "center",
          // Multi-layer glass effect
          background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.06) 100%)",
          border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: "100px",
          padding: "10px 28px",
          display: "inline-flex",
          gap: "0.22em",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          maxWidth: width * 0.88,
          flexWrap: "wrap",
        }}
      >
        {activeLine.words.map((w, i) => {
          const isSpoken  = time >= w.start;
          const isCurrent = time >= w.start && time < w.end;
          const relFrame  = frame - Math.round(w.start * fps);

          const wordSpring = isCurrent
            ? spring({ frame: relFrame, fps, config: { mass: 0.3, damping: 10, stiffness: 200 }, durationInFrames: 8 })
            : 0;

          const scale = isCurrent
            ? interpolate(wordSpring, [0, 1], [0.9, 1.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : 1.0;

          const color = isCurrent
            ? accent
            : isSpoken
            ? "rgba(255,255,255,0.90)"
            : "rgba(255,255,255,0.28)";

          const glow = isCurrent
            ? `0 0 12px ${accent}88, 0 0 24px ${accent}44`
            : "none";

          return (
            <span
              key={`${w.word}-${i}`}
              style={{
                fontFamily: isCurrent ? activeFont : contextFont,
                color,
                fontWeight: isCurrent ? 800 : isSpoken ? 500 : 400,
                transform: `scale(${scale})`,
                textShadow: glow,
                transition: "color 0.12s ease, font-weight 0.1s ease",
                display: "inline-block",
                willChange: "transform",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
