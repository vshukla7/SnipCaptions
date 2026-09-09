import { Container, Text, TextStyle } from "pixi.js";
import { PixiThemeContext } from "./types";
import { interpolate, spring } from "@/lib/pixi/animations";

export function renderCleanTheme(ctx: PixiThemeContext) {
  const { activeLine, time, fps, baseFont, fontSize, container } = ctx;
  if (!activeLine || !activeLine.words || activeLine.words.length === 0) return;

  const words = activeLine.words;
  const lineGroup = new Container();
  let currentX = 0;
  const spacing = fontSize * 0.25;

  // Reusable TextStyle instance created once outside the per-word loop
  const style = new TextStyle({
    fontFamily: baseFont,
    fontSize: Math.round(fontSize * 1.05),
    fontWeight: "700",
    fill: "#FFFFFF",
    });

  words.forEach((w) => {
    const isSpoken = time >= w.start;
    const wordRelFrame = isSpoken ? Math.max(0, Math.round((time - w.start) * fps)) : 0;

    // Use spring physics for smooth easing
    const slideSpr = isSpoken
      ? spring({
          frame: wordRelFrame,
          fps,
          config: { mass: 0.5, damping: 14, stiffness: 220 },
        })
      : 0;

    const startY = fontSize * 0.6; // Starts below
    const endY = 0; // Ends at center

    const wordY = isSpoken
      ? interpolate(slideSpr, [0, 1], [startY, endY], { extrapolateRight: "clamp" })
      : startY;

    // Completely hidden until spoken, then fades in smoothly
    const wordAlpha = isSpoken
      ? interpolate(slideSpr, [0, 1], [0, 1], { extrapolateRight: "clamp" })
      : 0;

    const textNode = ctx.getTextNode(w.word, style);
    textNode.anchor.set(0, 0.5);
    textNode.position.set(currentX, wordY);
    textNode.alpha = wordAlpha;

    lineGroup.addChild(textNode);
    currentX += textNode.width + spacing;
  });

  // Center the entire line group
  lineGroup.position.set(-currentX / 2 + spacing / 2, 0);
  container.addChild(lineGroup);
}
