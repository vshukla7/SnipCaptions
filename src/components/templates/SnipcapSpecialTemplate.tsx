import React from "react";
import { spring, interpolate } from "remotion";
import { TemplateProps } from "./types";

export const SnipcapSpecialTemplate: React.FC<TemplateProps> = ({
  activeLine,
  baseFont,
  fontSize,
  accentColor,
  width,
  frame,
  fps,
  time,
  customFontFamily,
}) => {
  if (!activeLine) return null;

  const activeFont = customFontFamily || '"Longmile", "Gilroy", sans-serif';
  const contextFont = customFontFamily || '"SF Pro Display", "Inter", sans-serif';

  return (
    <div
      style={{
        fontFamily: contextFont,
        fontSize,
        fontWeight: 800,
        textAlign: "center",
        lineHeight: 1.2,
        maxWidth: width * 0.92,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {activeLine.words.map((w, i) => {
        const spoken = time >= w.start;
        const justStarted = time >= w.start && time < w.end;
        const wordAge = frame - w.start * fps;

        let transform = "translateY(0px)";
        let opacity = 1;
        let color = "#ffffff";
        let fontSizeOverride = fontSize;

        if (!spoken) {
          opacity = 0; // Hide completely before spoken
        } else if (justStarted) {
          color = accentColor || "#30d158";
          fontSizeOverride = fontSize * 1.22;

          const activeSpring = spring({
            frame: wordAge,
            fps,
            config: { damping: 15, stiffness: 120, mass: 0.5 },
            durationInFrames: 10,
          });
          const y = interpolate(activeSpring, [0, 1], [15, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          transform = `translateY(${y}px)`;
        } else {
          color = "#ffffff";
          opacity = 0.55;
          fontSizeOverride = fontSize * 0.9;

          const prevSpring = spring({
            frame: frame - w.end * fps,
            fps,
            config: { damping: 18, stiffness: 100, mass: 0.5 },
            durationInFrames: 12,
          });
          const x = interpolate(prevSpring, [0, 1], [0, -8], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          transform = `translateX(${x}px)`;
        }

        const currentFont = justStarted ? activeFont : contextFont;

        return (
          <span
            key={`${w.word}-${i}`}
            style={{
              display: "inline-block",
              fontFamily: currentFont,
              color,
              transform,
              opacity,
              fontSize: fontSizeOverride,
              fontWeight: justStarted ? 900 : 600,
              margin: "0 0.18em",
              textTransform: "uppercase",
              transition: "color 0.15s ease",
              willChange: "transform, opacity",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
