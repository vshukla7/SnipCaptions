import { Container } from "pixi.js";
import type { Word } from "@/lib/types";

export interface Line {
  text: string;
  words: Word[];
  start: number;
  end: number;
}

export interface PixiThemeContext {
  words: Word[];
  activeLine: Line;
  activeWord: Word | undefined;
  activeWordIdx: number;
  time: number;
  frame: number;
  fps: number;
  width: number;
  height: number;
  fontSize: number;
  accentColor: string;
  baseFont: string;
  customFontFamily?: string | null;
  container: Container;
  getTextNode: (text: string, style: any) => import("pixi.js").Text;
  getGraphicsNode: (
    shape: "roundRect",
    params: {
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      fill?: { color?: any; alpha?: number };
      stroke?: { color?: any; alpha?: number; width?: number };
    }
  ) => import("pixi.js").Graphics;
}
