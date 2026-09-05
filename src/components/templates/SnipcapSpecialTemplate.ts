import { Container, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";
import type { Word } from "@/lib/types";
import { interpolate, spring } from "@/lib/pixi/animations";

const TOP_FONT = '"Helvetica Bold", "Helvetica Neue", sans-serif';
const BOTTOM_FONT = '"Celosia Nature", "Caveat", "Kalam", cursive';

export function renderSnipcapSpecialTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fps, fontSize, accentColor, container } = ctx;
  if (!activeLine || !activeLine.words || activeLine.words.length === 0) return;

  const words = activeLine.words;
  const accent = accentColor || "#2997FF";

  // Divide into 2 lines. 3-4 words per line.
  const splitIndex = words.length >= 6 ? Math.ceil(words.length / 2) : Math.min(4, words.length);
  const topWords = words.slice(0, splitIndex);
  const bottomWords = words.slice(splitIndex);

  const renderLine = (lineWords: Word[], isTopLine: boolean) => {
    if (lineWords.length === 0) return;
    
    const lineGroup = new Container();
    let currentX = 0;
    const spacing = fontSize * 0.28;

    lineWords.forEach((w) => {
      const isSpoken = time >= w.start;
      const wordRelFrame = isSpoken ? Math.max(0, Math.round((time - w.start) * fps)) : 0;

      const slideSpr = isSpoken
        ? spring({
            frame: wordRelFrame,
            fps,
            config: { mass: 0.45, damping: 13, stiffness: 200 },
          })
        : 0;

      const startY = isTopLine ? -fontSize * 0.3 : fontSize * 0.8;
      const endY = isTopLine ? -fontSize * 0.6 : fontSize * 0.55;

      const wordY = isSpoken
        ? interpolate(slideSpr, [0, 1], [startY, endY], { extrapolateRight: "clamp" })
        : startY;

      // Words are completely hidden until spoken.
      const wordAlpha = isSpoken
        ? interpolate(slideSpr, [0, 1], [0, 1], { extrapolateRight: "clamp" })
        : 0;

      const fillStyle = isTopLine ? accent : "#FFFFFF";

      const style = new TextStyle({
        fontFamily: isTopLine ? TOP_FONT : BOTTOM_FONT,
        fontSize: Math.round(fontSize * (isTopLine ? 1.3 : 0.95)),
        fontWeight: isTopLine ? "900" : "normal",
        fill: fillStyle,
        dropShadow: { alpha: 0.6, blur: 6, color: "#000000", distance: 2 },
      });

      const text = new Text({ text: isTopLine ? w.word.toUpperCase() : w.word.toLowerCase(), style });
      text.anchor.set(0, 0.5);
      text.position.set(currentX, wordY);
      text.alpha = wordAlpha;

      lineGroup.addChild(text);
      currentX += text.width + spacing;
    });

    lineGroup.position.set(-currentX / 2 + spacing / 2, 0);
    container.addChild(lineGroup);
  };

  renderLine(topWords, true);
  renderLine(bottomWords, false);
}
