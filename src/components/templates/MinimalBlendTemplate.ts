import { Container, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";
import type { Word } from "@/lib/types";
import { interpolate, spring } from "@/lib/pixi/animations";

export function renderMinimalBlendTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fps, fontSize, container, baseFont } = ctx;
  if (!activeLine || !activeLine.words || activeLine.words.length === 0) return;

  const words = activeLine.words;
  const font = baseFont || '"Helvetica Bold", sans-serif';

  // Stack Pattern: 2 words on top, 1 BIG hero word in middle, 2 words on bottom
  let topWords: Word[] = [];
  let heroWords: Word[] = [];
  let bottomWords: Word[] = [];

  if (words.length >= 5) {
    topWords = words.slice(0, 2);
    heroWords = [words[2]];
    bottomWords = words.slice(3);
  } else if (words.length === 4) {
    topWords = words.slice(0, 2);
    heroWords = [words[2]];
    bottomWords = words.slice(3);
  } else if (words.length === 3) {
    topWords = [words[0]];
    heroWords = [words[1]];
    bottomWords = [words[2]];
  } else if (words.length === 2) {
    topWords = [words[0]];
    heroWords = [words[1]];
    bottomWords = [];
  } else {
    topWords = [];
    heroWords = [words[0]];
    bottomWords = [];
  }

  const renderGroup = (groupWords: Word[], yOffset: number, scale: number) => {
    if (groupWords.length === 0) return;

    const groupContainer = new Container();
    let currentX = 0;
    const spacing = fontSize * 0.25;

    groupWords.forEach((w) => {
      const isSpoken = time >= w.start;
      const wordRelFrame = isSpoken ? Math.max(0, Math.round((time - w.start) * fps)) : 0;
      
      // Pseudo-random determination if this word has animation based on its start time
      const hasAnimation = Math.round(w.start * 100) % 3 !== 0;

      const slideSpr = isSpoken && hasAnimation
        ? spring({ frame: wordRelFrame, fps, config: { mass: 0.45, damping: 14, stiffness: 220 } })
        : (isSpoken ? 1 : 0);

      const ySlideOffset = fontSize * 0.8;
      const wordY = isSpoken && hasAnimation
        ? interpolate(slideSpr, [0, 1], [ySlideOffset, 0], { extrapolateRight: "clamp" })
        : (isSpoken ? 0 : ySlideOffset);

      const wordAlpha = isSpoken && hasAnimation
        ? interpolate(slideSpr, [0, 1], [0, 1], { extrapolateRight: "clamp" })
        : (isSpoken ? 1 : 0);

      const style = new TextStyle({
        fontFamily: font,
        fontSize: Math.round(fontSize * scale),
        fontWeight: "900",
        fill: "#FFFFFF",
        letterSpacing: -1,
        });

      const text = ctx.getTextNode(w.word, style);
      text.anchor.set(0, 0.5);
      text.position.set(currentX, wordY);
      text.alpha = wordAlpha;

      groupContainer.addChild(text);
      currentX += text.width + spacing;
    });

    groupContainer.position.set(-currentX / 2 + spacing / 2, yOffset);
    container.addChild(groupContainer);
  };

  // Render the three stacked lines
  renderGroup(topWords, -fontSize * 1.1, 1.2);
  renderGroup(heroWords, 0, 2.8);
  renderGroup(bottomWords, fontSize * 1.7, 1.2);
}
