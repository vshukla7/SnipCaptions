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

  // Pre-created reusable style instances outside the per-word loop
  const activeStyle = new TextStyle({
    fontFamily: baseFont,
    fontSize: Math.round(fontSize * 1.05),
    fontWeight: "700",
    fill: accent,
    });

  const pastStyle = new TextStyle({
    fontFamily: baseFont,
    fontSize: Math.round(fontSize * 1.05),
    fontWeight: "700",
    fill: "#FFFFFF",
    });

  const futureStyle = new TextStyle({
    fontFamily: baseFont,
    fontSize: Math.round(fontSize * 1.05),
    fontWeight: "700",
    fill: "rgba(255,255,255,0.45)",
  });

  lineWords.forEach((w) => {
    const isCurrent = time >= w.start && time < w.end;
    const isPast = time >= w.end;
    const style = isCurrent ? activeStyle : isPast ? pastStyle : futureStyle;

    const wordText = ctx.getTextNode(w.word, style);
    wordText.anchor.set(0, 0.5);
    wordText.scale.set(isCurrent ? 1.08 : 1.0);
    wordText.position.set(currentX, 0);

    lineGroup.addChild(wordText);
    currentX += wordText.width + spacing;
  });

  lineGroup.position.set(-currentX / 2, 0);
  container.addChild(lineGroup);
}
