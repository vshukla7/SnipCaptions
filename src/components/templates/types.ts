import type { Word } from "@/lib/types";

export interface TemplateProps {
  words: Word[];
  activeLine: { words: Word[]; text: string; start: number; end: number } | undefined;
  activeWord: Word | undefined;
  activeWordIdx: number;
  time: number;
  frame: number;
  fps: number;
  width: number;
  fontSize: number;
  accentColor: string;
  baseFont: string;
  prevWordsStr: string;
  nextWordsStr: string;
  customFontFamily?: string | null;
  isPlaying?: boolean;
}
