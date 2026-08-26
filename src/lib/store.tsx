"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AppStatus,
  CaptionPosition,
  CaptionThemeId,
  TranscriptionResult,
  Word,
} from "./types";
import { transcribeVideo } from "./gemini";

interface AppContextValue {
  apiKey: string;
  setApiKey: (k: string) => void;
  hasApiKey: boolean;

  videoFile: File | null;
  videoUrl: string | null;
  setVideo: (f: File | null) => void;

  language: string;
  setLanguage: (l: string) => void;

  captionTheme: CaptionThemeId;
  setCaptionTheme: (t: CaptionThemeId) => void;

  captionPosition: CaptionPosition;
  setCaptionPosition: (p: CaptionPosition | ((prev: CaptionPosition) => CaptionPosition)) => void;

  captionScale: number;
  setCaptionScale: (s: number | ((prev: number) => number)) => void;

  customAccentColor: string | null;
  setCustomAccentColor: (c: string | null) => void;

  customFontFamily: string | null;
  setCustomFontFamily: (f: string | null) => void;

  recentColors: string[];

  words: Word[];
  transcription: TranscriptionResult | null;
  durationInSeconds: number;

  status: AppStatus;
  statusMessage: string;
  progress: number;
  wordsSoFar: number;
  error: string | null;

  transcribe: () => Promise<void>;
  openDemoStudio: () => void;
  updateWord: (index: number, newWord: string) => void;
  reset: () => void;
  setStatusMessage: (m: string) => void;
  setProgress: (p: number) => void;
  setStatus: (s: AppStatus) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const API_KEY_STORAGE = "sc_api_key";
const LANG_STORAGE = "sc_language";
const THEME_STORAGE = "sc_caption_theme";

const RECENT_COLORS_STORAGE = "sc_recent_colors";
const FONT_STORAGE = "sc_custom_font";

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [language, setLanguageState] = useState("auto");
  const [captionTheme, setCaptionThemeState] = useState<CaptionThemeId>("clean");
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>({ x: 50, y: 80 });
  const [captionScale, setCaptionScale] = useState<number>(1.0);
  const [customAccentColor, setCustomAccentColorState] = useState<string | null>(null);
  const [customFontFamily, setCustomFontFamilyState] = useState<string | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [wordsSoFar, setWordsSoFar] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [durationInSeconds, setDurationInSeconds] = useState(0);
  const urlRef = useRef<string | null>(null);

  // Hydrate persisted values
  useEffect(() => {
    setApiKeyState(localStorage.getItem(API_KEY_STORAGE) ?? "");
    setLanguageState(localStorage.getItem(LANG_STORAGE) ?? "auto");
    setCaptionThemeState(
      (localStorage.getItem(THEME_STORAGE) as CaptionThemeId) ?? "clean",
    );
    setCustomFontFamilyState(localStorage.getItem(FONT_STORAGE));
    try {
      const raw = localStorage.getItem(RECENT_COLORS_STORAGE);
      if (raw) setRecentColors(JSON.parse(raw));
    } catch {}
  }, []);

  const setApiKey = useCallback((k: string) => {
    setApiKeyState(k);
    localStorage.setItem(API_KEY_STORAGE, k);
  }, []);

  const setLanguage = useCallback((l: string) => {
    setLanguageState(l);
    localStorage.setItem(LANG_STORAGE, l);
  }, []);

  const setCaptionTheme = useCallback((t: CaptionThemeId) => {
    setCaptionThemeState(t);
    localStorage.setItem(THEME_STORAGE, t);
  }, []);

  const setCustomAccentColor = useCallback((c: string | null) => {
    setCustomAccentColorState(c);
    if (c) {
      setRecentColors((prev) => {
        const filtered = prev.filter((item) => item.toLowerCase() !== c.toLowerCase());
        const updated = [c, ...filtered].slice(0, 6);
        localStorage.setItem(RECENT_COLORS_STORAGE, JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const setCustomFontFamily = useCallback((f: string | null) => {
    setCustomFontFamilyState(f);
    if (f) {
      localStorage.setItem(FONT_STORAGE, f);
    } else {
      localStorage.removeItem(FONT_STORAGE);
    }
  }, []);

  const setVideo = useCallback((f: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    if (!f) {
      setVideoFile(null);
      setVideoUrl(null);
      setTranscription(null);
      setDurationInSeconds(0);
      setStatus("idle");
      return;
    }
    const url = URL.createObjectURL(f);
    urlRef.current = url;
    setVideoFile(f);
    setVideoUrl(url);
    setTranscription(null);
    setStatus("idle");
    setError(null);
    console.log("[SnipCaptions:store] video selected ·", f.name, f.type, (f.size / 1024 / 1024).toFixed(1) + "MB", "url=", url);

    // Probe duration
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      console.log("[SnipCaptions:store] video duration probed =", probe.duration, "s");
      setDurationInSeconds(probe.duration || 0);
    };
  }, []);

  const transcribe = useCallback(async () => {
    if (!videoFile || !apiKey) {
      console.warn("[SnipCaptions:store] transcribe aborted — missing video or apiKey");
      setError("Add your Gemini API key and a video first.");
      return;
    }
    console.log("[SnipCaptions:store] transcribe start · file=", videoFile.name, "language=", language, "duration=", durationInSeconds, "keyLen=", apiKey.length);
    setError(null);
    setStatus("transcribing");
    setProgress(0);
    setWordsSoFar(0);
    setStatusMessage("Uploading…");
    try {
      const result = await transcribeVideo({
        apiKey,
        file: videoFile,
        language,
        durationSeconds: durationInSeconds,
        onStatus: (m) => setStatusMessage(m),
        onProgress: (p) => {
          setProgress(p.progress);
          setWordsSoFar(p.words);
        },
      });
      console.log("[SnipCaptions:store] transcription success · words=", result.words.length, "language=", result.language);
      setTranscription(result);
      setWordsSoFar(result.words.length);
      setProgress(1);
      setStatus("ready");
      setStatusMessage("Transcription complete");
    } catch (e) {
      console.error("[SnipCaptions:store] transcription error", e);
      setStatus("error");
      setError(e instanceof Error ? e.message : "Transcription failed");
      setStatusMessage("");
    }
  }, [videoFile, apiKey, language, durationInSeconds]);

  const openDemoStudio = useCallback(() => {
    const dummyWords: Word[] = [
      { word: "A", start: 0.2, end: 0.6 },
      { word: "quick", start: 0.65, end: 1.1 },
      { word: "brown", start: 1.15, end: 1.7 },
      { word: "fox", start: 1.75, end: 2.2 },
      { word: "jumps", start: 2.25, end: 2.8 },
      { word: "over", start: 2.85, end: 3.3 },
      { word: "the", start: 3.35, end: 3.7 },
      { word: "lazy", start: 3.75, end: 4.3 },
      { word: "dog", start: 4.35, end: 4.9 },
      { word: "always", start: 4.95, end: 5.5 },
      { word: "on", start: 5.55, end: 5.9 },
      { word: "the", start: 5.95, end: 6.3 },
      { word: "video", start: 6.35, end: 7.0 },
    ];
    setTranscription({
      language: "en",
      text: "A quick brown fox jumps over the lazy dog always on the video",
      words: dummyWords,
    });
    setVideoUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    setDurationInSeconds(15);
    setStatus("ready");
    setError(null);
  }, []);

  const updateWord = useCallback((index: number, newWord: string) => {
    setTranscription((prev) => {
      if (!prev || !prev.words[index]) return prev;
      const newWords = [...prev.words];
      newWords[index] = { ...newWords[index], word: newWord };
      return {
        ...prev,
        words: newWords,
        text: newWords.map((w) => w.word).join(" "),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setVideo(null);
    setTranscription(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
    setStatusMessage("");
  }, [setVideo]);

  const words = useMemo(() => transcription?.words ?? [], [transcription]);

  const value: AppContextValue = {
    apiKey,
    setApiKey,
    hasApiKey: apiKey.trim().length > 0,
    videoFile,
    videoUrl,
    setVideo,
    language,
    setLanguage,
    captionTheme,
    setCaptionTheme,
    captionPosition,
    setCaptionPosition,
    captionScale,
    setCaptionScale,
    customAccentColor,
    setCustomAccentColor,
    customFontFamily,
    setCustomFontFamily,
    recentColors,
    words,
    transcription,
    durationInSeconds,
    status,
    progress,
    statusMessage,
    wordsSoFar,
    error,
    transcribe,
    openDemoStudio,
    updateWord,
    reset,
    setStatusMessage,
    setProgress,
    setStatus,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
