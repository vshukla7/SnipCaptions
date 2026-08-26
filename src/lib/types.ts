export type CaptionThemeId =
  | "neon"
  | "kinetic"
  | "clean"
  | "highlight"
  | "snipcap_special"
  | "black_punch"
  | "liquid_glass"
  | "one_word";

export interface CaptionPosition {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

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
  {
    id: "snipcap_special",
    name: "Snipcap Special",
    description: "Premium Apple-style hybrid slide-up/left layout with dramatic timing.",
    fontClass: "font-display",
    accent: "#30d158",
    wordByWord: true,
  },
  {
    id: "black_punch",
    name: "Black Punch",
    description: "Crisp black lettering with stark high-contrast typography.",
    fontClass: "font-creative",
    accent: "#000000",
    wordByWord: true,
  },
  {
    id: "liquid_glass",
    name: "Liquid Glass",
    description: "Elegant glassmorphism pill badge layout.",
    fontClass: "font-display",
    accent: "#ffffff",
    wordByWord: true,
  },
  {
    id: "one_word",
    name: "One Word Solo",
    description: "Display only the currently spoken word, with zero animations.",
    fontClass: "font-display",
    accent: "#ffd60a",
    wordByWord: true,
  },
];

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "hi-Latn", label: "Hinglish (Latin script)" },
  { code: "hi", label: "Hindi (हिंदी)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "mr", label: "Marathi (मराठी)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "gu", label: "Gujarati (ગુજરાતી)" },
  { code: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", label: "Malayalam (മലയാളം)" },
  { code: "pa", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "or", label: "Odia (ଓଡ଼ିଆ)" },
  { code: "as", label: "Assamese (অসমীয়া)" },
  { code: "ur", label: "Urdu (اردو)" },
  { code: "bho", label: "Bhojpuri (भोजपुरी)" },
  { code: "sa", label: "Sanskrit (संस्कृतम्)" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "auto", label: "Auto-detect" },
];
