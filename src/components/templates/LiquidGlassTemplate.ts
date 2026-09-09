import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";

export function renderLiquidGlassTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fontSize, accentColor, baseFont, container } = ctx;
  if (!activeLine || !activeLine.words) return;

  const lineWords = activeLine.words;
  const accent = accentColor || "#38BDF8";
  const lineGroup = new Container();

  let currentX = 0;
  const spacing = fontSize * 0.3;

  lineWords.forEach((w) => {
    const isCurrent = time >= w.start && time < w.end;

    const style = new TextStyle({
      fontFamily: baseFont,
      fontSize: Math.round(fontSize * 0.95),
      fontWeight: isCurrent ? "800" : "600",
      fill: isCurrent ? accent : "#FFFFFF",
    });

    const wordText = ctx.getTextNode(w.word, style);
    wordText.anchor.set(0, 0.5);
    wordText.position.set(currentX, 0);
    wordText.alpha = isCurrent ? 1 : 0.5;

    lineGroup.addChild(wordText);
    currentX += wordText.width + spacing;
  });

  const pillPaddingX = 24;
  const pillHeight = Math.round(fontSize * 1.6);
  const pillWidth = currentX + pillPaddingX * 2 - spacing;

  const bg = new Graphics();
  bg.roundRect(-pillWidth / 2, -pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
  bg.fill({ color: 0xffffff, alpha: 0.15 });
  bg.stroke({ color: 0xffffff, alpha: 0.35, width: 1.5 });

  container.addChild(bg);
  lineGroup.position.set(-currentX / 2 + spacing / 2, 0);
  container.addChild(lineGroup);
}
