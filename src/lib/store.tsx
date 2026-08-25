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

  words: Word[];
  transcription: TranscriptionResult | null;
  durationInSeconds: number;

  status: AppStatus;
  statusMessage: string;
  progress: number;
  error: string | null;

  transcribe: () => Promise<void>;
  reset: () => void;
  setStatusMessage: (m: string) => void;
  setProgress: (p: number) => void;
  setStatus: (s: AppStatus) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const API_KEY_STORAGE = "sc_api_key";
const LANG_STORAGE = "sc_language";
const THEME_STORAGE = "sc_caption_theme";

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [language, setLanguageState] = useState("auto");
  const [captionTheme, setCaptionThemeState] = useState<CaptionThemeId>("clean");
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null);
  const [status, setStatus] = useState<AppStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
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

    // Probe duration
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      setDurationInSeconds(probe.duration || 0);
    };
  }, []);

  const transcribe = useCallback(async () => {
    if (!videoFile || !apiKey) {
      setError("Add your Gemini API key and a video first.");
      return;
    }
    setError(null);
    setStatus("transcribing");
    setProgress(0.1);
    setStatusMessage("Starting transcription…");
    try {
      const result = await transcribeVideo({
        apiKey,
        file: videoFile,
        language,
        onStatus: (m) => setStatusMessage(m),
      });
      setTranscription(result);
      setProgress(1);
      setStatus("ready");
      setStatusMessage("Transcription complete");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Transcription failed");
      setStatusMessage("");
    }
  }, [videoFile, apiKey, language]);

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
    words,
    transcription,
    durationInSeconds,
    status,
    statusMessage,
    progress,
    error,
    transcribe,
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
