export type CaptionThemeId = "neon" | "kinetic" | "clean" | "highlight";

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionResult {
  words: Word[];
  language: string;
  text: string;
}

export type AppStatus =
  | "idle"
  | "uploading"
  | "transcribing"
  | "ready"
  | "exporting"
  | "error";

export interface CaptionThemeMeta {
  id: CaptionThemeId;
  name: string;
  description: string;
  /** Tailwind/CSS font family token used for the preview chip */
  fontClass: string;
  /** Accent color used by the theme */
  accent: string;
  /** Whether the theme highlights one word at a time */
  wordByWord: boolean;
}

export const CAPTION_THEMES: CaptionThemeMeta[] = [
  {
    id: "clean",
    name: "Clean Minimal",
    description: "Crisp white captions, centered, no fuss.",
    fontClass: "font-display",
    accent: "#ffffff",
    wordByWord: false,
  },
  {
    id: "neon",
    name: "Neon Glow",
    description: "Electrified glow with a colored halo.",
    fontClass: "font-creative",
    accent: "#00e5ff",
    wordByWord: false,
  },
  {
    id: "kinetic",
    name: "Kinetic Bounce",
    description: "Words bounce in with spring physics.",
    fontClass: "font-creative",
    accent: "#f97316",
    wordByWord: true,
  },
  {
    id: "highlight",
    name: "Word-by-Word Highlight",
    description: "Each spoken word lights up as you talk.",
    fontClass: "font-display",
    accent: "#ffd60a",
    wordByWord: true,
  },
];

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hinglish / Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "auto", label: "Auto-detect" },
];
