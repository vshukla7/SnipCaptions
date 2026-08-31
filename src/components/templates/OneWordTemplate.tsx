import React from "react";
import { TemplateProps } from "./types";

export const OneWordTemplate: React.FC<TemplateProps> = React.memo(({
  activeWord,
  baseFont,
  fontSize,
  accentColor,
  width,
  isPlaying,
}) => {
  if (!activeWord) return null;
  return (
    <div
      style={{
        fontFamily: baseFont,
        fontSize: fontSize * 1.35,
        fontWeight: 900,
        textAlign: "center",
        color: accentColor || "#ffffff",
        textShadow: isPlaying ? "none" : "0 2px 14px rgba(0,0,0,0.65)",
        maxWidth: width * 0.9,
        textTransform: "uppercase",
      }}
    >
      {activeWord.word}
    </div>
  );
});
OneWordTemplate.displayName = "OneWordTemplate";
