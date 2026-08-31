import React from "react";
import { spring, interpolate } from "remotion";
import { TemplateProps } from "./types";

export const KineticTemplate: React.FC<TemplateProps> = React.memo(({
  activeLine,
  baseFont,
  fontSize,
  accentColor,
  width,
  frame,
  fps,
  time,
  isPlaying,
}) => {
  if (!activeLine) return null;
  return (
    <div
      style={{
        fontFamily: baseFont,
        fontSize,
        fontWeight: 800,
        textAlign: "center",
        lineHeight: 1.2,
        maxWidth: width * 0.92,
      }}
    >
      {activeLine.words.map((w, i) => {
        const justStarted = time >= w.start && time < w.end;
        const appearFrame = w.start * fps;
        const s = spring({
          frame: frame - appearFrame,
          fps,
          config: { damping: 16, stiffness: 130, mass: 0.5 },
          durationInFrames: 14,
        });
        const y = interpolate(s, [0, 1], [24, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = interpolate(s, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const transform = `translateY(${y}px)`;
        const color = justStarted ? accentColor : "#ffffff";

        return (
          <span
            key={`${w.word}-${i}`}
            style={{
              display: "inline-block",
              color,
              transform,
              textShadow: isPlaying ? "none" : "0 2px 12px rgba(0,0,0,0.55)",
              margin: "0 0.18em",
              fontWeight: 800,
              opacity,
              willChange: "transform, opacity",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
});
KineticTemplate.displayName = "KineticTemplate";
