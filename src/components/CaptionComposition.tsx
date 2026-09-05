import React from "react";
import { AbsoluteFill } from "remotion";
import { Video } from "@remotion/media";
import type { CaptionPosition, CaptionThemeId, Word } from "@/lib/types";

export interface CaptionCompositionProps {
  src: string;
  words: Word[];
  theme: CaptionThemeId;
  accentColor: string;
  maxWordsPerLine?: number;
  position?: CaptionPosition;
  scale?: number;
  customFontFamily?: string | null;
  mutedVideo?: boolean;
}

const MemoizedVideo = React.memo<{ src: string; muted: boolean }>(({ src, muted }) => {
  if (!src || !src.trim()) {
    return (
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 80%, #1a1a2e 0%, #0d0d12 60%, #000000 100%)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: "8%",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px)",
            pointerEvents: "none",
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <Video
      src={src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        transform: "translate3d(0, 0, 0)",
        willChange: "transform",
      }}
      muted={muted}
    />
  );
});
MemoizedVideo.displayName = "MemoizedVideo";

export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
  src,
  mutedVideo = false,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <MemoizedVideo src={src} muted={mutedVideo} />
    </AbsoluteFill>
  );
};
