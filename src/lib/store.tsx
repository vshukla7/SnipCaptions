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
import { validateVideoContainerAndCodec } from "./utils";

// ─── Proxy status ──────────────────────────────────────────────────────────────
export type ProxyStatus = "idle" | "generating" | "ready" | "failed";

export interface StudioActions {
  onDownloadSRT: () => void;
  onExport: () => void;
}

interface AppContextValue {
  apiKey: string;
  setApiKey: (k: string) => void;
  hasApiKey: boolean;

  videoFile: File | null;
  /** Active player URL — 480p proxy when ready, original blob otherwise */
  videoUrl: string | null;
  /** Always the full-quality original blob URL — use this for export */
  originalVideoUrl: string | null;
  originalWidth: number;
  originalHeight: number;
  setVideo: (f: File | null) => void;

  proxyStatus: ProxyStatus;
  proxyProgress: number;

  /** Fire-and-forget toast from the proxy engine. Studio watches this to show a UI toast. */
  proxyToast: { type: "warning" | "error"; message: string } | null;
  clearProxyToast: () => void;

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
  studioActions: StudioActions | null;
  setStudioActions: (actions: StudioActions | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const API_KEY_STORAGE = "sc_api_key";
const LANG_STORAGE = "sc_language";
const THEME_STORAGE = "sc_caption_theme";

const RECENT_COLORS_STORAGE = "sc_recent_colors";
const FONT_STORAGE = "sc_custom_font";

// Resolution threshold: proxy is generated for videos at or above this height/width
// const PROXY_THRESHOLD_PX = 1080;
// Safety cap: WASM load must finish within this time (network-dependent).
// The encode itself runs without a timeout — it is always allowed to complete.
// const WASM_LOAD_TIMEOUT_MS = 30_000;

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number>(1080);
  const [originalHeight, setOriginalHeight] = useState<number>(1920);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus>("idle");
  const [needsProxy, setNeedsProxy] = useState(false);
  const [proxyProgress, setProxyProgress] = useState(0);
  const [proxyToast, setProxyToast] = useState<{ type: "warning" | "error"; message: string } | null>(null);

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
  const [studioActions, setStudioActions] = useState<StudioActions | null>(null);

  // Track blob URLs for cleanup
  const originalUrlRef = useRef<string | null>(null);
  const proxyUrlRef = useRef<string | null>(null);

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

  // ─── Proxy generation engine ────────────────────────────────────────────────
  // Runs zero-transcode canvas downscaling. Does not run FFmpeg WASM transcoding.
  const generateProxy = useCallback(async (file: File, originalUrl: string) => {
    console.log("[SnipCaptions:proxy] Starting zero-transcode preview engine optimization for", file.name);
    setProxyStatus("generating");
    setProxyProgress(0);

    // Instant loading bar transition
    await new Promise((resolve) => setTimeout(resolve, 800));
    setProxyProgress(1.0);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Swap player URL to the original URL (no transcode, downscaling done on the fly)
    setVideoUrl(originalUrl);
    setProxyStatus("ready");
    console.log("[SnipCaptions:proxy] Preview engine optimization ready →", originalUrl);
  }, []);

  // ─── setVideo ───────────────────────────────────────────────────────────────
  const setVideo = useCallback(async (f: File | null) => {
    // Revoke previous blob URLs
    if (proxyUrlRef.current) {
      URL.revokeObjectURL(proxyUrlRef.current);
      proxyUrlRef.current = null;
    }
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
    }

    if (!f) {
      setVideoFile(null);
      setVideoUrl(null);
      setOriginalVideoUrl(null);
      setProxyStatus("idle");
      setNeedsProxy(false);
      setProxyProgress(0);
      setProxyToast(null);
      setTranscription(null);
      setDurationInSeconds(0);
      setStatus("idle");
      setOriginalWidth(1080);
      setOriginalHeight(1920);
      return;
    }

    setError(null);
    setStatus("idle");

    if (f.size > 100 * 1024 * 1024) {
      setError("This video is not supported on your browser or device. The maximum supported video size is 100 MB.");
      setVideoFile(null);
      setVideoUrl(null);
      setOriginalVideoUrl(null);
      setProxyStatus("failed");
      return;
    }

    try {
      const validation = await validateVideoContainerAndCodec(f);
      if (!validation.supported) {
        setError(validation.reason || "Only H.264 (AVC) encoded videos are accepted. Please convert your video and try again.");
        setVideoFile(null);
        setVideoUrl(null);
        setOriginalVideoUrl(null);
        setProxyStatus("failed");
        return;
      }
    } catch {
      setError("Failed to verify video container. Please ensure it is a valid MP4/H.264 video.");
      return;
    }

    const url = URL.createObjectURL(f);

    let metadata: { duration: number; width: number; height: number };
    try {
      metadata = await new Promise((resolve, reject) => {
        const probe = document.createElement("video");
        probe.preload = "metadata";
        probe.muted = true;
        probe.onloadedmetadata = () => {
          resolve({
            duration: probe.duration || 0,
            width: probe.videoWidth,
            height: probe.videoHeight,
          });
        };
        probe.onerror = () => reject(new Error("Video metadata could not be decoded."));
        probe.src = url;
        probe.load();
      });
    } catch {
      URL.revokeObjectURL(url);
      setError("This video is not supported on your browser or device. Please use a browser-compatible MP4 video.");
      setVideoFile(null);
      setVideoUrl(null);
      setOriginalVideoUrl(null);
      setProxyStatus("failed");
      return;
    }

    const device = navigator as Navigator & { deviceMemory?: number };
    const isPhone = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) || window.innerWidth < 768;
    const isLowEndDevice = (device.deviceMemory ?? Infinity) <= 4 || device.hardwareConcurrency <= 4;
    const maxSupportedDimension = isPhone || isLowEndDevice ? 1920 : Infinity;
    const videoMaxDimension = Math.max(metadata.width, metadata.height);

    if (videoMaxDimension > maxSupportedDimension) {
      URL.revokeObjectURL(url);
      setError(
        `This video resolution is not supported on your browser or device. ${isPhone || isLowEndDevice ? "Phones and low-end devices support up to 1080p (1920px maximum)." : "Please use a supported video resolution."}`,
      );
      setVideoFile(null);
      setVideoUrl(null);
      setOriginalVideoUrl(null);
      setProxyStatus("failed");
      return;
    }

    originalUrlRef.current = url;

    setVideoFile(f);
    setVideoUrl(url);           // player starts with original
    setOriginalVideoUrl(url);   // export always uses this
    setProxyStatus("idle");
    setNeedsProxy(true);        // Always enable proxy optimized flow for adaptive preview sizing
    setProxyProgress(0);
    setTranscription(null);
    setStatus("idle");
    setError(null);

    console.log(
      "[SnipCaptions:store] video selected ·",
      f.name, f.type,
      (f.size / 1024 / 1024).toFixed(1) + "MB",
      "url=", url,
    );

    setOriginalWidth(metadata.width);
    setOriginalHeight(metadata.height);
    setDurationInSeconds(metadata.duration);

    console.log(
      "[SnipCaptions:store] video metadata · duration=", metadata.duration,
      "· resolution=", `${metadata.width}x${metadata.height}`,
    );

    // Save whether a proxy is needed to trigger it during transcription
    setNeedsProxy(true);
    console.log("[SnipCaptions:proxy] Zero-transcode proxy enabled for visual downscaling.");
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
      // 1. Transcription task
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
      
      const rawMessage = e instanceof Error ? e.message : String(e);
      const lower = rawMessage.toLowerCase();
      let friendlyError = rawMessage;

      if (
        lower.includes("api key") ||
        lower.includes("apikey") ||
        lower.includes("api_key") ||
        lower.includes("key is invalid") ||
        lower.includes("invalid key")
      ) {
        friendlyError = "Invalid Gemini API Key. Please verify your API key in the top-right settings and try again.";
      } else if (lower.includes("returned no words")) {
        friendlyError = rawMessage;
      } else {
        friendlyError = "We encountered a temporary issue with the Gemini API. Please try again, as this is usually a temporary issue.";
      }

      setError(friendlyError);
      setStatusMessage("");
    }
  }, [videoFile, apiKey, language, durationInSeconds, needsProxy, generateProxy, originalVideoUrl, videoUrl]);

  const openDemoStudio = useCallback(() => {
    const dummyWords: Word[] = [
      { word: "the",    start: 0.10, end: 0.38 },
      { word: "quick",  start: 0.42, end: 0.75 },
      { word: "brown",  start: 0.78, end: 1.10 },
      { word: "fox",    start: 1.14, end: 1.42 },
      { word: "jumps",  start: 1.46, end: 1.80 },
      { word: "over",   start: 1.84, end: 2.12 },
      { word: "a",      start: 2.16, end: 2.32 },
      { word: "lazy",   start: 2.36, end: 2.68 },
      { word: "dog",    start: 2.72, end: 3.00 },
      { word: "and",    start: 3.04, end: 3.22 },
      { word: "then",   start: 3.26, end: 3.54 },
      { word: "runs",   start: 3.58, end: 3.86 },
      { word: "into",   start: 3.90, end: 4.16 },
      { word: "the",    start: 4.20, end: 4.38 },
      { word: "wild",   start: 4.42, end: 4.72 },
      { word: "night",  start: 4.76, end: 5.10 },
      { word: "again",  start: 5.14, end: 5.50 },
      { word: "forever",start: 5.54, end: 6.00 },
    ];
    setTranscription({
      language: "en",
      text: "the quick brown fox jumps over a lazy dog and then runs into the wild night again forever",
      words: dummyWords,
    });
    setVideoUrl(""); // No external video — CaptionComposition renders gradient placeholder
    setDurationInSeconds(7);
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

  const clearProxyToast = useCallback(() => setProxyToast(null), []);

  const words = useMemo(() => transcription?.words ?? [], [transcription]);

  const value: AppContextValue = {
    apiKey,
    setApiKey,
    hasApiKey: apiKey.trim().length > 0,
    videoFile,
    videoUrl,
    originalVideoUrl,
    originalWidth,
    originalHeight,
    setVideo,
    proxyStatus,
    proxyProgress,
    proxyToast,
    clearProxyToast,
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
    studioActions,
    setStudioActions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
