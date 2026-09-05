import { Container, Text, TextStyle, FillGradient } from "pixi.js";
import { PixiThemeContext } from "./types";
import type { Word } from "@/lib/types";
import { interpolate, spring } from "@/lib/pixi/animations";

export function renderPremiereGlowTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fps, fontSize, container, baseFont, accentColor } = ctx;
  if (!activeLine || !activeLine.words || activeLine.words.length === 0) return;

  const words = activeLine.words;
  const font = baseFont || '"Helvetica Bold", sans-serif';
  const accent = accentColor || "#FFE600";

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

  const renderGroup = (groupWords: Word[], yOffset: number, scale: number, isHero: boolean = false) => {
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

      let fillType: any = "#FFFFFF";
      if (isHero) {
          // Adjust for internal canvas padding added by drop shadows
          const h = Math.round(fontSize * scale * 1.2);
          const grad = new FillGradient({
            type: "linear",
            start: { x: 0, y: 0 },
            end: { x: 0, y: h },
            textureSpace: "global",
          });
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.2, '#ffffff');
          grad.addColorStop(0.8, accent);
          grad.addColorStop(1, accent);
          fillType = grad;
      }

      const style = new TextStyle({
        fontFamily: font,
        fontSize: Math.round(fontSize * scale),
        fontWeight: "900",
        fill: fillType,
        letterSpacing: -1,
        dropShadow: isHero 
          ? { alpha: 1.0, blur: 25, color: accent, distance: 0 } 
          : { alpha: 0.8, blur: 8, color: "#000000", distance: 4 },
      });

      const textNode = new Text({ text: w.word, style });
      textNode.anchor.set(0, 0.5);

      textNode.position.set(currentX, wordY);
      textNode.alpha = wordAlpha;

      groupContainer.addChild(textNode);
      currentX += textNode.width + spacing;
    });

    groupContainer.position.set(-currentX / 2 + spacing / 2, yOffset);
    container.addChild(groupContainer);
  };

  // Render the three stacked lines
  renderGroup(topWords, -fontSize * 1.1, 1.2, false);
  renderGroup(heroWords, 0, 2.8, true);
  renderGroup(bottomWords, fontSize * 1.7, 1.2, false);
}
