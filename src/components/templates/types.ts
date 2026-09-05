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
}
