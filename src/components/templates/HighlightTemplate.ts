import { Container, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";

export function renderHighlightTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fontSize, accentColor, baseFont, container } = ctx;
  if (!activeLine || !activeLine.words) return;

  const lineWords = activeLine.words;
  const accent = accentColor || "#FFD60A";
  const lineGroup = new Container();

  let currentX = 0;
  const spacing = fontSize * 0.32;

  lineWords.forEach((w) => {
    const isCurrent = time >= w.start && time < w.end;
    const isPast = time >= w.end;

    const style = new TextStyle({
      fontFamily: baseFont,
      fontSize: Math.round(fontSize * 1.05),
      fontWeight: "700",
      fill: isCurrent ? accent : isPast ? "#FFFFFF" : "rgba(255,255,255,0.45)",
      dropShadow: isCurrent
        ? { alpha: 0.9, blur: 12, color: accent, distance: 0 }
        : { alpha: 0.6, blur: 4, color: "#000000", distance: 2 },
    });

    const wordText = new Text({ text: w.word, style });
    wordText.anchor.set(0, 0.5);
    wordText.scale.set(isCurrent ? 1.08 : 1.0);
    wordText.position.set(currentX, 0);

    lineGroup.addChild(wordText);
    currentX += wordText.width + spacing;
  });

  lineGroup.position.set(-currentX / 2, 0);
  container.addChild(lineGroup);
}
