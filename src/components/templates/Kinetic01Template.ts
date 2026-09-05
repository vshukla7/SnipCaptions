import { Container, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";
import { interpolate, spring } from "@/lib/pixi/animations";

const TOP_FONT = '"Celosia Nature", "Caveat", "Kalam", cursive';
const BOTTOM_FONT = '"Gilroy", "Helvetica Neue", sans-serif';

export function renderKinetic01Theme(ctx: PixiThemeContext) {
  const { words, activeLine, activeWord, activeWordIdx, time, frame, fps, width, fontSize, accentColor, baseFont, container } = ctx;
  if (!words || words.length === 0) return;

  const activeIndex = activeWordIdx >= 0 ? activeWordIdx : 0;
  const currentWord = activeWord || words[activeIndex] || words[0];

  const lineWords = activeLine?.words || [currentWord];
  const accent = accentColor || "#FFD60A";
  const mainFont = baseFont || BOTTOM_FONT;

  const isCurrentActive = time >= currentWord.start && time < currentWord.end;
  const wordRelFrame = isCurrentActive ? Math.max(0, Math.round((time - currentWord.start) * fps)) : 0;

  const heroSpring = spring({
    frame: wordRelFrame,
    fps,
    config: { mass: 0.5, damping: 12, stiffness: 200 },
  });

  const heroScale = isCurrentActive
    ? interpolate(heroSpring, [0, 1], [0.8, 1.15], { extrapolateRight: "clamp" })
    : 1.0;

  const heroY = isCurrentActive
    ? interpolate(heroSpring, [0, 1], [15, 0], { extrapolateRight: "clamp" })
    : 0;

  const heroAlpha = isCurrentActive
    ? interpolate(heroSpring, [0, 1], [0, 1], { extrapolateRight: "clamp" })
    : 0.8;

  // Render Top Cursive Pre-context Text
  if (lineWords.length > 1 && lineWords[0] !== currentWord) {
    const topTextStr = lineWords
      .slice(0, lineWords.indexOf(currentWord))
      .map((w) => w.word)
      .join(" ");

    if (topTextStr.trim()) {
      const topStyle = new TextStyle({
        fontFamily: TOP_FONT,
        fontSize: Math.round(fontSize * 0.9),
        fill: accent,
        align: "center",
        dropShadow: {
          alpha: 0.6,
          blur: 6,
          color: "#000000",
          distance: 2,
        },
      });

      const topText = new Text({ text: topTextStr, style: topStyle });
      topText.anchor.set(0.5, 1);
      topText.position.set(0, -fontSize * 0.65);
      container.addChild(topText);
    }
  }

  // Render Main Bold Hero Active Word
  const heroStyle = new TextStyle({
    fontFamily: mainFont,
    fontSize: Math.round(fontSize * 1.5),
    fontWeight: "900",
    fill: "#FFFFFF",
    stroke: { color: "#000000", width: 5 },
    align: "center",
    dropShadow: {
      alpha: 0.85,
      blur: 12,
      color: accent,
      distance: 0,
    },
  });

  const heroText = new Text({ text: currentWord.word.toUpperCase(), style: heroStyle });
  heroText.anchor.set(0.5, 0.5);
  heroText.scale.set(heroScale);
  heroText.position.set(0, heroY);
  heroText.alpha = heroAlpha;
  container.addChild(heroText);

  // Render Bottom Floating Word if available
  const curIdxInLine = lineWords.indexOf(currentWord);
  if (curIdxInLine >= 0 && curIdxInLine < lineWords.length - 1) {
    const bottomTextStr = lineWords
      .slice(curIdxInLine + 1)
      .map((w) => w.word)
      .join(" ");

    if (bottomTextStr.trim()) {
      const bottomStyle = new TextStyle({
        fontFamily: mainFont,
        fontSize: Math.round(fontSize * 0.85),
        fontWeight: "700",
        fill: "#FFFFFF",
        align: "center",
        dropShadow: {
          alpha: 0.7,
          blur: 4,
          color: "#000000",
          distance: 2,
        },
      });

      const bottomText = new Text({ text: bottomTextStr.toUpperCase(), style: bottomStyle });
      bottomText.anchor.set(0.5, 0);
      bottomText.position.set(0, fontSize * 0.75);
      bottomText.alpha = 0.7;
      container.addChild(bottomText);
    }
  }
}
