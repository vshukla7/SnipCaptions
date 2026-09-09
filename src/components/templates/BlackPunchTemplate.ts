import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";
import { spring } from "@/lib/pixi/animations";

export function renderBlackPunchTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fps, baseFont, fontSize, container } = ctx;
  if (!activeLine || !activeLine.words || activeLine.words.length === 0) return;

  const words = activeLine.words;
  const font = baseFont || '"Helvetica Bold", "Gilroy", sans-serif';
  const lineGroup = new Container();

  const padX = fontSize * 0.28;
  const padY = fontSize * 0.12;
  const spacing = fontSize * 0.3;

  // Pass 1: Measure all word positions cleanly to prevent text shaking & layout shifts
  const wordMeasurements = words.map((w) => {
    const textStr = w.word.toUpperCase();
    const tempStyle = new TextStyle({
      fontFamily: font,
      fontSize: Math.round(fontSize * 1.05),
      fontWeight: "900",
    });
    const tempText = ctx.getTextNode(textStr, tempStyle);
    const wordWidth = tempText.width;
    return { word: w, textStr, wordWidth };
  });

  const totalLineWidth = wordMeasurements.reduce((acc, m) => acc + m.wordWidth, 0) + (words.length - 1) * spacing;
  let currentX = -totalLineWidth / 2;

  // Pass 2: Render words with smooth pop spring animation on active pill badge
  wordMeasurements.forEach(({ word: w, textStr, wordWidth }) => {
    const isCurrent = time >= w.start && time < w.end;
    const wordCenterX = currentX + wordWidth / 2;

    if (isCurrent) {
      const relTime = time - w.start;
      const relFrame = Math.max(0, Math.round(relTime * fps));

      const spr = spring({
        frame: relFrame,
        fps,
        config: { mass: 0.35, stiffness: 280, damping: 13 },
      });

      // Smooth pop scale spring effect
      const popScale = 0.75 + spr * 0.3;
      const popAlpha = Math.min(1, spr * 2);

      const activeStyle = new TextStyle({
        fontFamily: font,
        fontSize: Math.round(fontSize * 1.05),
        fontWeight: "900",
        fill: "#000000",
      });

      const activeText = ctx.getTextNode(textStr, activeStyle);
      activeText.anchor.set(0.5, 0.5);

      const pillWidth = wordWidth + padX * 2;
      const pillHeight = activeText.height + padY * 2;

      const bg = new Graphics();
      bg.roundRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, fontSize * 0.2);
      bg.fill({ color: 0xffffff, alpha: 1.0 });

      const wordContainer = new Container();
      wordContainer.addChild(bg);
      wordContainer.addChild(activeText);

      wordContainer.position.set(wordCenterX, 0);
      wordContainer.scale.set(popScale);
      wordContainer.alpha = popAlpha;

      lineGroup.addChild(wordContainer);
    } else {
      const inactiveStyle = new TextStyle({
        fontFamily: font,
        fontSize: Math.round(fontSize * 1.05),
        fontWeight: "900",
        fill: "#FFFFFF",
        });

      const inactiveText = ctx.getTextNode(textStr, inactiveStyle);
      inactiveText.anchor.set(0.5, 0.5);
      inactiveText.position.set(wordCenterX, 0);

      lineGroup.addChild(inactiveText);
    }

    currentX += wordWidth + spacing;
  });

  container.addChild(lineGroup);
}
