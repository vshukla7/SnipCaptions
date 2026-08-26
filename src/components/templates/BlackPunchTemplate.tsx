import React from "react";
import { TemplateProps } from "./types";

export const BlackPunchTemplate: React.FC<TemplateProps> = ({
  activeWord,
  baseFont,
  fontSize,
  width,
  prevWordsStr,
  nextWordsStr,
  customFontFamily,
}) => {
  if (!activeWord) return null;

  const activeFont = customFontFamily || '"Gilroy", sans-serif';
  const contextFont = customFontFamily || '"Qurova Light", serif';

  return (
    <div
      style={{
        fontFamily: contextFont,
        fontSize,
        fontWeight: 800,
        textAlign: "center",
        lineHeight: 1.1,
        maxWidth: width * 0.9,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {prevWordsStr && (
        <div style={{ color: "rgba(0,0,0,0.28)", fontSize: fontSize * 0.55, textTransform: "uppercase", marginBottom: 6, fontFamily: contextFont }}>
          {prevWordsStr}
        </div>
      )}
      <div
        style={{
          fontFamily: activeFont,
          color: "#000000",
          fontSize: fontSize * 1.35,
          fontWeight: 900,
          textTransform: "uppercase",
          WebkitTextStroke: "1px rgba(255,255,255,0.8)",
          textShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {activeWord.word}
      </div>
      {nextWordsStr && (
        <div style={{ color: "rgba(0,0,0,0.28)", fontSize: fontSize * 0.55, textTransform: "uppercase", marginTop: 6, fontFamily: contextFont }}>
          {nextWordsStr}
        </div>
      )}
    </div>
  );
};
