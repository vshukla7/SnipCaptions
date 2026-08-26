import React from "react";
import { TemplateProps } from "./types";

export const NeonTemplate: React.FC<TemplateProps> = ({
  activeLine,
  baseFont,
  fontSize,
  accentColor,
  width,
}) => {
  if (!activeLine) return null;
  return (
    <div
      style={{
        fontFamily: baseFont,
        fontSize,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        textAlign: "center",
        lineHeight: 1.1,
        textShadow: `0 0 8px ${accentColor}, 0 0 22px ${accentColor}, 0 2px 10px rgba(0,0,0,0.6)`,
        color: "#ffffff",
        maxWidth: width * 0.9,
      }}
    >
      {activeLine.words.map((w, i) => (
        <span key={`${w.word}-${i}`} style={{ margin: "0 0.16em" }}>
          {w.word}
        </span>
      ))}
    </div>
  );
};
