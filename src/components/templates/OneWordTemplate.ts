import { Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";

export function renderOneWordTheme(ctx: PixiThemeContext) {
  const { activeWord, fontSize, accentColor, baseFont, container } = ctx;
  if (!activeWord) return;

  const accent = accentColor || "#FFD60A";
  const style = new TextStyle({
    fontFamily: baseFont,
    fontSize: Math.round(fontSize * 1.6),
    fontWeight: "900",
    fill: accent,
    stroke: { color: "#000000", width: 5 },
    });

  const text = ctx.getTextNode(activeWord.word.toUpperCase(), style);
  text.anchor.set(0.5, 0.5);
  container.addChild(text);
}
