import React from "react";
import { spring, interpolate, AbsoluteFill } from "remotion";
import type { Word } from "@/lib/types";

// JSON Configuration Interface
export interface YellowScriptConfig {
  placementY: number; // e.g., 78 for 78% from top
  topLineFont: string; // e.g., "'Celosia Nature', 'Caveat', 'Kalam', cursive"
  topLineColor: string; // e.g., "#FFDC00"
  bottomLineFont: string; // e.g., "'Gilroy', 'The Bold Font', 'Fredoka', sans-serif"
  bottomLineColor: string; // e.g., "#FFFFFF"
  highlightColor: string; // e.g., "#FF1E1E"
  spring: {
    mass: number;
    damping: number;
    stiffness: number;
  };
}

// Default JSON configuration
export const defaultYellowScriptConfig: YellowScriptConfig = {
  placementY: 78,
  topLineFont: "'Celosia Nature', 'Caveat', 'Kalam', cursive",
  topLineColor: "#FFDC00",
  bottomLineFont: "'Gilroy', 'The Bold Font', 'Fredoka', sans-serif",
  bottomLineColor: "#FFFFFF",
  highlightColor: "#FF1E1E",
  spring: {
    mass: 0.5,
    damping: 12,
    stiffness: 200,
  },
};

export interface YellowScriptCaptionProps {
  words: Word[];
  activeLine: { words: Word[]; text: string; start: number; end: number } | undefined;
  time: number;
  frame: number;
  fps: number;
  width: number;
  height: number;
  config?: YellowScriptConfig;
}

export const YellowScriptCaption: React.FC<YellowScriptCaptionProps> = ({
  activeLine,
  time,
  frame,
  fps,
  width,
  height,
  config = defaultYellowScriptConfig,
}) => {
  if (!activeLine || activeLine.words.length === 0) return null;

  const totalWords = activeLine.words.length;
  const splitIndex = Math.max(1, Math.ceil(totalWords / 2));
  
  const topWords = activeLine.words.slice(0, splitIndex);
  const bottomWords = activeLine.words.slice(splitIndex);

  // Entrance spring animation based on activeLine start
  const lineStartFrame = activeLine.start * fps;
  const lineDurationFrames = (activeLine.end - activeLine.start) * fps;
  const age = frame - lineStartFrame;

  const popSpring = spring({
    frame: age,
    fps,
    config: {
      mass: config.spring.mass,
      damping: config.spring.damping,
      stiffness: config.spring.stiffness,
    },
    durationInFrames: 15,
  });

  // Entrance pop scale from 0.8 to 1.05 and back to 1.0
  const scale = interpolate(popSpring, [0, 0.7, 1], [0.8, 1.05, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 2-frame fast fade out at the end of the line duration
  const opacity = interpolate(
    age,
    [lineDurationFrames - 2, lineDurationFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const fontSize = Math.round(width * 0.065);
  const dropShadow = "0 3px 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.6)";

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: `${config.placementY}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        textAlign: "center",
        maxWidth: width * 0.9,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        willChange: "transform, opacity",
      }}
    >
      {/* Top Line: Accent Script Font */}
      {topWords.length > 0 && (
        <div
          style={{
            fontFamily: config.topLineFont,
            fontSize: fontSize * 0.95,
            color: config.topLineColor,
            textShadow: dropShadow,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            lineHeight: 1.1,
          }}
        >
          {topWords.map((w, idx) => {
            const isCurrent = time >= w.start && time < w.end;
            return (
              <span
                key={`top-${w.word}-${idx}`}
                style={{
                  margin: "0 0.16em",
                  textTransform: "lowercase",
                  // Cursive accent active highlight: slight glow
                  color: isCurrent ? "#FFFFFF" : config.topLineColor,
                  fontWeight: 400,
                  transition: "color 0.1s ease",
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}

      {/* Bottom Line: Main Heavy Bold Font */}
      {bottomWords.length > 0 && (
        <div
          style={{
            fontFamily: config.bottomLineFont,
            fontSize: fontSize * 1.1,
            fontWeight: 900,
            color: config.bottomLineColor,
            textShadow: dropShadow,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            lineHeight: 1.05,
          }}
        >
          {bottomWords.map((w, idx) => {
            const isCurrent = time >= w.start && time < w.end;
            return (
              <span
                key={`bottom-${w.word}-${idx}`}
                style={{
                  margin: "0 0.18em",
                  textTransform: "uppercase",
                  color: isCurrent ? config.highlightColor : config.bottomLineColor,
                  transition: "color 0.1s ease",
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
