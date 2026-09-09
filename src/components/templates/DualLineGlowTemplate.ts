import { Container, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";
import { interpolate, spring } from "@/lib/pixi/animations";

const TOP_FONT = '"Gilroy", "Helvetica Neue", sans-serif';
const BOTTOM_FONT = '"Celosia Nature", "Caveat", "Kalam", cursive';

export function renderDualLineGlowTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fps, fontSize, accentColor, baseFont, container } = ctx;
  if (!activeLine || !activeLine.words || activeLine.words.length === 0) return;

  const words = activeLine.words;
  const accent = accentColor || "#FFB800";
  const topFont = baseFont || TOP_FONT;

  // Split words into 3-4 words on top line and 3-4 words on bottom line
  const topWordCount = words.length >= 5 ? Math.min(4, Math.max(3, Math.ceil(words.length / 2))) : Math.max(1, Math.ceil(words.length / 2));
  const topWords = words.slice(0, topWordCount);
  const bottomWords = words.slice(topWordCount);

  // 1. Top Line Uppercase Words (3-4 words, revealed as spoken)
  const topGroup = new Container();
  let topX = 0;
  const topSpacing = fontSize * 0.28;

  topWords.forEach((w) => {
    const isCurrent = time >= w.start && time < w.end;
    const isSpoken = time >= w.start;

    const fadeProgress = isSpoken ? Math.min(1, (time - w.start) * 12) : 0;
    const wordAlpha = isSpoken ? 0.35 + fadeProgress * 0.65 : 0.3;

    const style = new TextStyle({
      fontFamily: topFont,
      fontSize: Math.round(fontSize * 1.15),
      fontWeight: "900",
      fill: isCurrent ? accent : isSpoken ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
      stroke: { color: "#000000", width: isCurrent ? 4 : 2 },
      dropShadow: isCurrent
        ? { alpha: 0.95, blur: 18, color: accent, distance: 0 }
        : { alpha: 0.6, blur: 4, color: "#000000", distance: 2 },
      });

    const wordText = ctx.getTextNode(w.word.toUpperCase(), style);
    wordText.anchor.set(0, 0.5);
    wordText.scale.set(1.0);
    wordText.alpha = wordAlpha;
    wordText.position.set(topX, 0);

    topGroup.addChild(wordText);
    topX += wordText.width + topSpacing;
  });

  // Tighter Y spacing for top line (-0.22 * fontSize)
  topGroup.position.set(-topX / 2 + topSpacing / 2, -fontSize * 0.22);
  container.addChild(topGroup);

  // 2. Bottom Line Cursive Words (3-4 words, slides up tightly under top line)
  if (bottomWords.length > 0) {
    const botGroup = new Container();
    let botX = 0;
    const botSpacing = fontSize * 0.25;

    bottomWords.forEach((w) => {
      const isSpoken = time >= w.start;
      const wordRelFrame = isSpoken ? Math.max(0, Math.round((time - w.start) * fps)) : 0;

      const slideSpr = isSpoken
        ? spring({
            frame: wordRelFrame,
            fps,
            config: { mass: 0.45, damping: 13, stiffness: 200 },
          })
        : 0;

      // Slide up target tightly under top line (from 0.55 -> 0.15)
      const wordY = isSpoken
        ? interpolate(slideSpr, [0, 1], [fontSize * 0.55, fontSize * 0.15], { extrapolateRight: "clamp" })
        : fontSize * 0.55;

      const wordAlpha = isSpoken
        ? interpolate(slideSpr, [0, 1], [0, 1], { extrapolateRight: "clamp" })
        : 0;

      const bottomStyle = new TextStyle({
        fontFamily: BOTTOM_FONT,
        fontSize: Math.round(fontSize * 0.9),
        fill: "#FFFFFF",
        });

      const wordText = ctx.getTextNode(w.word.toLowerCase(), bottomStyle);
      wordText.anchor.set(0, 0);
      wordText.position.set(botX, wordY);
      wordText.alpha = wordAlpha;

      botGroup.addChild(wordText);
      botX += wordText.width + botSpacing;
    });

    botGroup.position.set(-botX / 2 + botSpacing / 2, 0);
    container.addChild(botGroup);
  }
}
