import React from "react";
import { TemplateProps } from "./types";

export const CleanTemplate: React.FC<TemplateProps> = ({
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
        color: accentColor || "#ffffff",
        textAlign: "center",
        lineHeight: 1.15,
        textShadow: "0 2px 14px rgba(0,0,0,0.6)",
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
