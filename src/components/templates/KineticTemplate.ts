import { Container, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";
import { spring } from "@/lib/pixi/animations";

export function renderKineticTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fontSize, accentColor, baseFont, container } = ctx;
  if (!activeLine || !activeLine.words) return;

  const lineWords = activeLine.words;
  const accent = accentColor || "#F97316";
  const lineGroup = new Container();

  let currentX = 0;
  const spacing = fontSize * 0.35;

  lineWords.forEach((w) => {
    const relTime = time - w.start;
    const isSpoken = relTime >= 0;
    const isCurrent = time >= w.start && time < w.end;

    const spr = spring({
      frame: Math.max(0, Math.round(relTime * 60)),
      fps: 60,
      config: { mass: 0.5, stiffness: 280, damping: 14 },
    });

    const popScale = isSpoken ? 0.6 + spr * 0.4 : 0.8;
    const wordAlpha = isSpoken ? Math.min(1, spr * 1.5) : 0.4;

    const style = new TextStyle({
      fontFamily: baseFont,
      fontSize: Math.round(fontSize * 1.1),
      fontWeight: "800",
      fill: isCurrent ? accent : "#FFFFFF",
      });

    const wordText = ctx.getTextNode(w.word, style);
    wordText.anchor.set(0, 0.5);
    wordText.scale.set(isCurrent ? popScale * 1.1 : popScale);
    wordText.alpha = wordAlpha;
    wordText.position.set(currentX, 0);

    lineGroup.addChild(wordText);
    currentX += wordText.width + spacing;
  });

  lineGroup.position.set(-currentX / 2, 0);
  container.addChild(lineGroup);
}
