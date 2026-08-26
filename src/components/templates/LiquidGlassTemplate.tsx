import React from "react";
import { TemplateProps } from "./types";

export const LiquidGlassTemplate: React.FC<TemplateProps> = ({
  activeLine,
  baseFont,
  fontSize,
  accentColor,
  width,
  time,
  customFontFamily,
}) => {
  if (!activeLine) return null;

  const activeFont = customFontFamily || '"Helvetica Rounded", sans-serif';
  const contextFont = customFontFamily || '"Readex Pro", sans-serif';

  return (
    <div
      style={{
        fontFamily: contextFont,
        fontSize: fontSize * 0.72,
        fontWeight: 500,
        textAlign: "center",
        background: "rgba(255, 255, 255, 0.12)",
        border: "1px solid rgba(255, 255, 255, 0.22)",
        borderRadius: "50px",
        padding: "8px 24px",
        display: "inline-flex",
        gap: "8px",
        justifyContent: "center",
        alignItems: "center",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {activeLine.words.map((w, i) => {
        const isCurrent = time >= w.start && time < w.end;
        const currentFont = isCurrent ? activeFont : contextFont;
        return (
          <span
            key={`${w.word}-${i}`}
            style={{
              fontFamily: currentFont,
              color: isCurrent ? (accentColor || "#ffffff") : "rgba(255,255,255,0.45)",
              fontWeight: isCurrent ? 800 : 400,
              transition: "color 0.15s ease",
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
