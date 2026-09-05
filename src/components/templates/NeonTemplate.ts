import { Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";

export function renderNeonTheme(ctx: PixiThemeContext) {
  const { activeLine, baseFont, fontSize, accentColor, container } = ctx;
  if (!activeLine) return;

  const accent = accentColor || "#00E5FF";

  const style = new TextStyle({
    fontFamily: baseFont,
    fontSize: Math.round(fontSize * 1.15),
    fontWeight: "800",
    fill: "#FFFFFF",
    stroke: { color: accent, width: 4 },
    align: "center",
    dropShadow: {
      alpha: 0.95,
      blur: 16,
      color: accent,
      distance: 0,
    },
  });

  const text = new Text({ text: activeLine.text.toUpperCase(), style });
  text.anchor.set(0.5, 0.5);
  container.addChild(text);
}
