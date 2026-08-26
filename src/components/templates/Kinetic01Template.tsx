/**
 * Kinetic01Template — adapted from remotion-captions-themes/Kinetic01
 *
 * Concept:
 * - Active line's words are chunked into groups of 3-4
 * - Each group has one "main word" (longest, bold, big)
 * - Side words float around it in Dancing Script cursive
 * - Main word gets slide-up / blur-in animation per line
 * - Side words get alternating slide+scale / instant reveal
 * - Active spoken word changes color to accentColor
 */

import React from "react";
import { interpolate } from "remotion";
import { TemplateProps } from "./types";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Chunk a word list into groups of 3-4 */
function groupWords<T>(words: T[]): T[][] {
  if (words.length <= 4) return [words];
  const groups: T[][] = [];
  let i = 0;
  while (i < words.length) {
    const remaining = words.length - i;
    const chunkSize = remaining === 4 ? 4 : remaining < 3 ? remaining : 3;
    groups.push(words.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return groups;
}

/** Seeded PRNG (sin-based) */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Approximate char-width for a word in pixels at given fontSize */
function estimateWidth(text: string, fontSize: number, isBold: boolean): number {
  // Bold compact font ≈ 0.6em, cursive light ≈ 0.5em per char
  const perChar = isBold ? fontSize * 0.6 : fontSize * 0.5;
  return text.length * perChar;
}

function estimateHeight(fontSize: number): number {
  return fontSize * 1.2;
}

type Anchor =
  | "top" | "bottom" | "left" | "right"
  | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

const ANCHOR_LIST: Anchor[] = [
  "topLeft", "topRight", "bottomLeft", "bottomRight",
  "top", "bottom", "left", "right",
];

const OPPOSITES: Record<Anchor, Anchor[]> = {
  topLeft:     ["bottomRight", "bottom", "right"],
  topRight:    ["bottomLeft", "bottom", "left"],
  bottomLeft:  ["topRight", "top", "right"],
  bottomRight: ["topLeft", "top", "left"],
  top:         ["bottom", "bottomLeft", "bottomRight"],
  bottom:      ["top", "topLeft", "topRight"],
  left:        ["right", "topRight", "bottomRight"],
  right:       ["left", "topLeft", "bottomLeft"],
};

/** Deterministicaly shuffled anchor list for a given seed */
function shuffleAnchors(anchors: Anchor[], seed: number): Anchor[] {
  const arr = [...anchors];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    const r = seededRandom(s);
    s = r * 10000;
    const j = Math.floor(r * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Resolve L-R overlaps in a horizontal word layer */
function resolveOverlaps(
  items: { idx: number; left: number; width: number }[],
): void {
  if (items.length < 2) return;
  items.sort((a, b) => a.left - b.left);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i];
      const b = items[i + 1];
      const overlap = a.left + a.width - b.left;
      if (overlap > 0) {
        a.left -= overlap / 2;
        b.left += overlap / 2;
      }
    }
  }
}

// ─── main component ──────────────────────────────────────────────────────────

export const Kinetic01Template: React.FC<TemplateProps> = ({
  activeLine,
  time,
  frame,
  fps,
  width,
  fontSize,
  accentColor,
  customFontFamily,
  activeWordIdx,
  words: allWords,
}) => {
  if (!activeLine) return null;

  const scaleFactor = width / 1080;
  const mainSize  = fontSize * 1.35;
  const sideSize  = fontSize * 0.78;

  // ── 1. chunk the line ──────────────────────────────────────────────────────
  const groups = React.useMemo(
    () => groupWords(activeLine.words),
    [activeLine],
  );

  // ── 2. active group ────────────────────────────────────────────────────────
  const activeGroupIdx = React.useMemo(() => {
    let best = 0;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (time >= g[0].start && time <= g[g.length - 1].end) { best = i; break; }
      if (time > g[g.length - 1].end) best = i;
    }
    return best;
  }, [groups, time]);

  const group = groups[activeGroupIdx] ?? [];
  if (group.length === 0) return null;

  // ── 3. main word (longest non-filler) ─────────────────────────────────────
  const mainIdx = React.useMemo(() => {
    let best = 0;
    let maxLen = -1;
    group.forEach((w, i) => {
      const len = w.word.replace(/[^a-zA-Z0-9]/g, "").length;
      if (len > maxLen) { maxLen = len; best = i; }
    });
    return best;
  }, [group]);

  // ── 4. layout: anchor positions ───────────────────────────────────────────
  const layout = React.useMemo(() => {
    const lineIdx = activeLine.start; // stable key

    const mainW = estimateWidth(group[mainIdx].word, mainSize * scaleFactor, true);
    const mainH = estimateHeight(mainSize * scaleFactor);

    // Main word centered at origin
    const mainBox = { left: -mainW / 2, top: -mainH / 2, width: mainW, height: mainH };

    const sideIndices = group.map((_, i) => i).filter(i => i !== mainIdx);

    // Choose anchors deterministically
    const shuffled = shuffleAnchors(ANCHOR_LIST, lineIdx + 1);
    const usedAnchors = new Set<Anchor>();
    const chosenAnchors: Anchor[] = [];

    if (sideIndices.length === 2) {
      const a1 = shuffled.find(a => !usedAnchors.has(a))!;
      usedAnchors.add(a1);
      const a2 = shuffled.find(a => !usedAnchors.has(a) && OPPOSITES[a1].includes(a)) ??
                 shuffled.find(a => !usedAnchors.has(a))!;
      usedAnchors.add(a2);
      chosenAnchors.push(a1, a2);
    } else {
      sideIndices.forEach(() => {
        const a = shuffled.find(a => !usedAnchors.has(a)) ?? shuffled[0];
        usedAnchors.add(a);
        chosenAnchors.push(a);
      });
    }

    const GAP = -4 * scaleFactor; // Negative gap = side words slightly overlap hero edges, very tight

    interface Box { left: number; top: number; width: number; height: number; anchor?: Anchor }
    const boxes: Box[] = [];

    // Insert main box at index mainIdx
    group.forEach((w, i) => {
      if (i === mainIdx) { boxes.push(mainBox); return; }
      const sIdx = sideIndices.indexOf(i);
      const anchor = chosenAnchors[sIdx];
      const sw = estimateWidth(w.word, sideSize * scaleFactor, false);
      const sh = estimateHeight(sideSize * scaleFactor);

      let left = 0; let top = 0;
      switch (anchor) {
        case "top":         left = -sw / 2;                       top = mainBox.top - sh - GAP; break;
        case "bottom":      left = -sw / 2;                       top = mainBox.top + mainH + GAP; break;
        case "left":        left = mainBox.left - sw - GAP;       top = -sh / 2; break;
        case "right":       left = mainBox.left + mainW + GAP;    top = -sh / 2; break;
        case "topLeft":     left = mainBox.left;                   top = mainBox.top - sh - GAP; break;
        case "topRight":    left = mainBox.left + mainW - sw;     top = mainBox.top - sh - GAP; break;
        case "bottomLeft":  left = mainBox.left;                   top = mainBox.top + mainH + GAP; break;
        case "bottomRight": left = mainBox.left + mainW - sw;     top = mainBox.top + mainH + GAP; break;
      }
      boxes.push({ left, top, width: sw, height: sh, anchor });
    });

    // Resolve horizontal overlaps per layer
    const topLayer    = boxes.map((b, i) => ({ ...b, idx: i })).filter(b => b.top < -mainH / 3);
    const bottomLayer = boxes.map((b, i) => ({ ...b, idx: i })).filter(b => b.top >= -mainH / 3);
    resolveOverlaps(topLayer);
    resolveOverlaps(bottomLayer);
    [...topLayer, ...bottomLayer].forEach(({ idx, left }) => { boxes[idx].left = left; });

    return boxes;
  }, [group, mainIdx, mainSize, sideSize, scaleFactor, activeLine.start]);

  // ── 5. animation type for this line ───────────────────────────────────────
  // 0 = none, 1 = slide-up, 2 = blur-in
  const animType = group.length === 1 ? 1 : (Math.round(activeLine.start * 10) % 3);

  // ── 6. render ──────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* origin div so all absolute boxes are relative to center */}
      <div style={{ position: "relative", width: 0, height: 0 }}>
        {group.map((word, idx) => {
          const box = layout[idx];
          if (!box) return null;

          const isMain = idx === mainIdx;
          const wordStartFrame = Math.round(word.start * fps);
          const relFrame = frame - wordStartFrame;

          // Word not yet spoken — hide
          if (relFrame < 0) return null;

          const isCurrent = time >= word.start && time < word.end;

          // ── animation values ──
          let opacity = 1;
          let transform = "none";
          let filter = "none";

          if (isMain) {
            if (animType === 1) {
              opacity = interpolate(relFrame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const ty = interpolate(relFrame, [0, 10], [25 * scaleFactor, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              transform = `translateY(${ty}px)`;
            } else if (animType === 2) {
              opacity = interpolate(relFrame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const blur = interpolate(relFrame, [0, 8], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              filter = `blur(${blur}px)`;
            }
          } else {
            const animated = (idx + Math.round(activeLine.start)) % 2 === 0;
            if (animated) {
              opacity = interpolate(relFrame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const ty = interpolate(relFrame, [0, 8], [15 * scaleFactor, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const sc = interpolate(relFrame, [0, 8], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              transform = `translateY(${ty}px) scale(${sc})`;
            }
          }

          const fontFamily = isMain
            ? (customFontFamily || '"Gilroy", "Helvetica Neue", Helvetica, Arial, sans-serif')
            : '"Celosia Nature", "Dancing Script", cursive';
          const size   = isMain ? mainSize : sideSize;
          const weight = isMain ? 900 : 700;
          const color  = isCurrent ? (accentColor || "#FFD60A") : "#ffffff";
          const shadow = isMain
            ? `0 ${8 * scaleFactor}px ${18 * scaleFactor}px rgba(0,0,0,0.65)`
            : `0 ${4 * scaleFactor}px ${10 * scaleFactor}px rgba(0,0,0,0.5)`;

          return (
            <div
              key={idx}
              style={{
                position: "absolute",
                left: box.left,
                top:  box.top,
                width: box.width,
                height: box.height,
                fontFamily,
                fontSize:   `${size * scaleFactor}px`,
                fontWeight: weight,
                color,
                opacity,
                transform,
                filter,
                textAlign:  "center",
                display:    "flex",
                justifyContent: "center",
                alignItems:     "center",
                textShadow: shadow,
                whiteSpace: "nowrap",
                transition: "color 0.1s ease",
                willChange: "transform, opacity, filter",
              }}
            >
              {word.word}
            </div>
          );
        })}
      </div>
    </div>
  );
};
