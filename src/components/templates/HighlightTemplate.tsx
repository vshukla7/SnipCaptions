import React from "react";
import { spring, interpolate } from "remotion";
import { TemplateProps } from "./types";

export const HighlightTemplate: React.FC<TemplateProps> = ({
  activeLine,
  baseFont,
  fontSize,
  accentColor,
  width,
  frame,
  fps,
  time,
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
        const spoken = time >= w.start;
        const justStarted = time >= w.start && time < w.end;
        let textShadow = "0 2px 12px rgba(0,0,0,0.55)";
        let color = spoken ? accentColor : "rgba(255,255,255,0.55)";

        if (justStarted) {
          const pulse = spring({
            frame: frame - w.start * fps,
            fps,
            config: { damping: 14, stiffness: 120 },
            durationInFrames: 14,
          });
          const glow = interpolate(pulse, [0, 1], [0, 10], {
            extrapolateRight: "clamp",
          });
          textShadow = `0 0 ${glow}px ${accentColor}, 0 2px 10px rgba(0,0,0,0.6)`;
        }

        return (
          <span
            key={`${w.word}-${i}`}
            style={{
              display: "inline-block",
              color,
              textShadow,
              margin: "0 0.18em",
              fontWeight: 800,
              willChange: "transform",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
