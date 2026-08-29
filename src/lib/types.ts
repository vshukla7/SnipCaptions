export type CaptionThemeId =
  | "neon"
  | "kinetic"
  | "clean"
  | "highlight"
  | "snipcap_special"
  | "black_punch"
  | "liquid_glass"
  | "one_word"
  | "yellow_script"
  | "kinetic_01"
  | "dual_line_glow"
  | "pw_edits"
  | "mr_beast"
  | "minimal_blend"
  | "premiere_glow";

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
    id: "minimal_blend",
    name: "Minimalist Blend",
    description: "Ultra-heavy typography stack with smooth slide-ups and difference mix-blend contrast.",
    fontClass: "font-display",
    accent: "#ffffff",
    wordByWord: true,
  },
  {
    id: "premiere_glow",
    name: "Premiere Glow",
    description: "Same as Minimalist Blend, but the biggest word features a Premiere Pro-style neon gradient glow.",
    fontClass: "font-display",
    accent: "#FFE600",
    wordByWord: true,
  },
  {
    id: "dual_line_glow",
    name: "Dual Line Glow",
    description: "Bold uppercase top with warm glow reveal + cursive slide-up bottom. Cinema style.",
    fontClass: "font-creative",
    accent: "#FFB800",
    wordByWord: true,
  },
  {
    id: "pw_edits",
    name: "PW Edits",
    description: "Montserrat top + Impact crimson bottom with red aura glow and camera push-in zoom.",
    fontClass: "font-creative",
    accent: "#FF1E2A",
    wordByWord: true,
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
  {
    id: "yellow_script",
    name: "Yellow Script",
    description: "Cursive accent top line + heavy bold bottom line. Reels/Shorts style.",
    fontClass: "font-display",
    accent: "#FFDC00",
    wordByWord: true,
  },
  {
    id: "kinetic_01",
    name: "Kinetic 01",
    description: "Main word big centered, side words float in cursive around it. Scene-based.",
    fontClass: "font-creative",
    accent: "#FFD60A",
    wordByWord: true,
  },
  {
    id: "mr_beast",
    name: "MrBeast Style",
    description: "Futura/Bebas bold uppercase with thick black outline, shadow, fast pops, and yellow highlight.",
    fontClass: "font-creative",
    accent: "#FFE600",
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
