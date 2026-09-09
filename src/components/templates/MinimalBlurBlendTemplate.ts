import { Container, Text, TextStyle, BlurFilter } from "pixi.js";
import { PixiThemeContext } from "./types";
import type { Word } from "@/lib/types";
import { interpolate, spring } from "@/lib/pixi/animations";

const TOP_FONT = '"Celosia Nature", "Caveat", "Kalam", cursive';
const MIDDLE_FONT = '"Helvetica Bold", "Helvetica Neue", sans-serif';
const BOTTOM_FONT = '"Celosia Nature", "Caveat", "Kalam", cursive';

export function renderMinimalBlurBlendTheme(ctx: PixiThemeContext) {
  const { activeLine, activeWord, time, fps, fontSize, accentColor, baseFont, container } = ctx;
  if (!activeLine || !activeLine.words || activeLine.words.length === 0) return;

  const words = activeLine.words;
  const accent = accentColor || "#2997FF";
  const middleFont = baseFont || MIDDLE_FONT;

  // 5-Word Pattern: 2 words on top, 1 BIG hero word in middle, 2 words on bottom
  let topWords: Word[] = [];
  let heroWordObj: Word | undefined = undefined;
  let bottomWords: Word[] = [];

  if (words.length >= 5) {
    topWords = words.slice(0, 2);
    heroWordObj = words[2];
    bottomWords = words.slice(3);
  } else if (words.length === 4) {
    topWords = words.slice(0, 2);
    heroWordObj = words[2];
    bottomWords = words.slice(3);
  } else if (words.length === 3) {
    topWords = [words[0]];
    heroWordObj = words[1];
    bottomWords = [words[2]];
  } else if (words.length === 2) {
    topWords = [];
    heroWordObj = words[0];
    bottomWords = [words[1]];
  } else {
    topWords = [];
    heroWordObj = words[0];
    bottomWords = [];
  }

  // 1. Layer 1: Top Line (2 small cursive words, e.g. "the quick" - word-by-word slide up)
  if (topWords.length > 0) {
    const topGroup = new Container();
    let topX = 0;
    const topSpacing = fontSize * 0.28;

    topWords.forEach((w) => {
      const isSpoken = time >= w.start;
      const wordRelFrame = isSpoken ? Math.max(0, Math.round((time - w.start) * fps)) : 0;

      const slideSpr = isSpoken
        ? spring({
            frame: wordRelFrame,
            fps,
            config: { mass: 0.45, damping: 13, stiffness: 200 },
          })
        : 0;

      const wordY = isSpoken
        ? interpolate(slideSpr, [0, 1], [-fontSize * 0.6, -fontSize * 0.85], { extrapolateRight: "clamp" })
        : -fontSize * 0.6;

      const wordAlpha = isSpoken
        ? interpolate(slideSpr, [0, 1], [0.35, 1], { extrapolateRight: "clamp" })
        : 0.3; // Visible beforehand in translucent state

      const scriptStyle = new TextStyle({
        fontFamily: TOP_FONT,
        fontSize: Math.round(fontSize * 0.95),
        fill: isSpoken ? "#FFFFFF" : "rgba(255, 255, 255, 0.5)",
        });

      const wordText = ctx.getTextNode(w.word.toLowerCase(), scriptStyle);
      wordText.anchor.set(0, 0.5);
      wordText.position.set(topX, wordY);
      wordText.alpha = wordAlpha;

      topGroup.addChild(wordText);
      topX += wordText.width + topSpacing;
    });

    topGroup.position.set(-topX / 2 + topSpacing / 2, 0);
    container.addChild(topGroup);
  }

  // 2. Layer 2: Middle Big Hero Word (1 word, e.g. "BROWN" - BIG blur-in animation)
  if (heroWordObj) {
    const isHeroSpoken = time >= heroWordObj.start;
    const heroRelFrame = isHeroSpoken ? Math.max(0, Math.round((time - heroWordObj.start) * fps)) : 0;

    const heroSpr = isHeroSpoken
      ? spring({
          frame: heroRelFrame,
          fps,
          config: { mass: 0.4, damping: 12, stiffness: 240 },
        })
      : 0;

    const blurAmount = isHeroSpoken
      ? interpolate(heroSpr, [0, 1], [20, 0], { extrapolateRight: "clamp" })
      : 20;

    const heroScale = isHeroSpoken
      ? interpolate(heroSpr, [0, 1], [1.2, 1.0], { extrapolateRight: "clamp" })
      : 1.0;

    const heroAlpha = isHeroSpoken
      ? interpolate(heroSpr, [0, 1], [0, 1.0], { extrapolateRight: "clamp" })
      : 0;

    const heroStyle = new TextStyle({
      fontFamily: middleFont,
      fontSize: Math.round(fontSize * 1.45),
      fontWeight: "900",
      fill: accent,
      });

    const heroText = ctx.getTextNode(heroWordObj.word.toUpperCase(), heroStyle);
    heroText.anchor.set(0.5, 0.5);
    heroText.position.set(0, 0); // Centered
    heroText.scale.set(heroScale);
    heroText.alpha = heroAlpha;

    if (blurAmount > 0.5) {
      const blurFilter = new BlurFilter({ strength: blurAmount, quality: 3 });
      heroText.filters = [blurFilter];
    }

    container.addChild(heroText);
  }

  // 3. Layer 3: Bottom Line (2 small cursive words, e.g. "fox jumps" - word-by-word slide up)
  if (bottomWords.length > 0) {
    const botGroup = new Container();
    let botX = 0;
    const botSpacing = fontSize * 0.28;

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

      const wordY = isSpoken
        ? interpolate(slideSpr, [0, 1], [fontSize * 1.1, fontSize * 0.85], { extrapolateRight: "clamp" })
        : fontSize * 1.1;

      const wordAlpha = isSpoken
        ? interpolate(slideSpr, [0, 1], [0, 1], { extrapolateRight: "clamp" })
        : 0; // Hidden until spoken!

      const bottomStyle = new TextStyle({
        fontFamily: BOTTOM_FONT,
        fontSize: Math.round(fontSize * 0.95),
        fill: "#FFFFFF",
        });

      const wordText = ctx.getTextNode(w.word.toLowerCase(), bottomStyle);
      wordText.anchor.set(0, 0.5);
      wordText.position.set(botX, wordY);
      wordText.alpha = wordAlpha;

      botGroup.addChild(wordText);
      botX += wordText.width + botSpacing;
    });

    botGroup.position.set(-botX / 2 + botSpacing / 2, 0);
    container.addChild(botGroup);
  }
}
