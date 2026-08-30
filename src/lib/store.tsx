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

// ─── Proxy status ──────────────────────────────────────────────────────────────
export type ProxyStatus = "idle" | "generating" | "ready" | "failed";

interface AppContextValue {
  apiKey: string;
  setApiKey: (k: string) => void;
  hasApiKey: boolean;

  videoFile: File | null;
  /** Active player URL — 480p proxy when ready, original blob otherwise */
  videoUrl: string | null;
  /** Always the full-quality original blob URL — use this for export */
  originalVideoUrl: string | null;
  setVideo: (f: File | null) => void;

  proxyStatus: ProxyStatus;
  isHevc: boolean;

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

// Resolution threshold: proxy is generated for videos at or above this height/width
const PROXY_THRESHOLD_PX = 1080;
// Safety cap: WASM load must finish within this time (network-dependent).
// The encode itself runs without a timeout — it is always allowed to complete.
const WASM_LOAD_TIMEOUT_MS = 30_000;

export function AppProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus>("idle");
  const [needsProxy, setNeedsProxy] = useState(false);
  const [isHevc, setIsHevc] = useState(false);
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
  // Runs inside FFmpeg's own internal Web Worker (ffmpeg v0.12.x).
  // Uses single-threaded core to avoid requiring COOP/COEP headers.
  // `videoDuration` is used to compute an adaptive WASM-load-only timeout;
  // the encode step itself is never aborted — it always runs to completion.
  const generateProxy = useCallback(async (file: File, originalUrl: string, videoDuration: number) => {
    console.log("[SnipCaptions:proxy] Starting 480p proxy generation for", file.name, `(${videoDuration.toFixed(1)}s)`);
    setProxyStatus("generating");

    // Abort controller covers only the WASM CDN fetch phase.
    // Once exec() begins we never abort — let the encode finish naturally.
    const loadAbortCtrl = new AbortController();
    const loadTimeoutId = setTimeout(() => {
      loadAbortCtrl.abort();
    }, WASM_LOAD_TIMEOUT_MS);

    let ffmpegInstance: import("@ffmpeg/ffmpeg").FFmpeg | null = null;

    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

      ffmpegInstance = new FFmpeg();

      ffmpegInstance.on("log", ({ message }) => {
        console.log("[FFmpeg:proxy]", message);
        if (
          message.includes("Video: hevc") ||
          message.includes("Video: h265") ||
          message.includes("hvc1")
        ) {
          console.log("[SnipCaptions:proxy] Detected HEVC/H.265 input stream.");
          setIsHevc(true);
        }
      });

      // Check if already aborted (before the heavy WASM fetch)
      if (loadAbortCtrl.signal.aborted) throw new DOMException("WASM load timed out", "AbortError");

      // Single-threaded FFmpeg core — no SharedArrayBuffer/COOP/COEP needed
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      }, { signal: loadAbortCtrl.signal });

      // WASM is loaded — cancel the load timeout, encode will now run freely
      clearTimeout(loadTimeoutId);
      console.log("[SnipCaptions:proxy] FFmpeg loaded, writing input file…");

      await ffmpegInstance.writeFile("proxy_input.mp4", await fetchFile(file));

      console.log("[SnipCaptions:proxy] Running transcode → 720p ultrafast with audio copy…");
      // scale=-2:720 keeps aspect ratio at 720p, ensures width is divisible by 2.
      // -map 0:v -map 0:a? maps video and optional audio.
      // -c:a copy copies audio directly (fast, no re-encoding).
      // -preset ultrafast + -crf 28 = fast encode.
      // -movflags faststart = metadata at front for instant seek.
      await ffmpegInstance.exec([
        "-i", "proxy_input.mp4",
        "-map", "0:v",
        "-map", "0:a?",
        "-vf", "scale=-2:720",
        "-c:v", "libx264",
        "-c:a", "copy",
        "-preset", "ultrafast",
        "-crf", "28",
        "-movflags", "faststart",
        "proxy_output.mp4",
      ]);

      const data = await ffmpegInstance.readFile("proxy_output.mp4");
      if (!(data instanceof Uint8Array)) throw new Error("FFmpeg returned non-binary data");

      const proxyBlob = new Blob([data as unknown as BlobPart], { type: "video/mp4" });
      const proxyUrl = URL.createObjectURL(proxyBlob);

      // Cleanup MEMFS
      await ffmpegInstance.deleteFile("proxy_input.mp4");
      await ffmpegInstance.deleteFile("proxy_output.mp4");
      ffmpegInstance.terminate();
      ffmpegInstance = null;

      // Revoke old proxy if one existed
      if (proxyUrlRef.current) {
        URL.revokeObjectURL(proxyUrlRef.current);
      }
      proxyUrlRef.current = proxyUrl;

      // Swap player URL to proxy — original URL stays in originalVideoUrl for export
      setVideoUrl(proxyUrl);
      setProxyStatus("ready");
      console.log("[SnipCaptions:proxy] 480p proxy ready →", proxyUrl);

    } catch (err) {
      clearTimeout(loadTimeoutId);

      // Cleanup FFmpeg instance if still alive
      if (ffmpegInstance) {
        try { ffmpegInstance.terminate(); } catch {}
        ffmpegInstance = null;
      }

      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const msg = isAbort
        ? "Preview optimization couldn't load — playing original quality. Check your internet connection."
        : "Preview optimization failed — playing original quality.";

      console.warn("[SnipCaptions:proxy]", isAbort ? "WASM load timed out" : "Error", err);

      // Fall back to original URL (already set as videoUrl — no change needed)
      setProxyStatus("failed");
      setProxyToast({ type: "warning", message: msg });
    }
  }, []);

  // ─── setVideo ───────────────────────────────────────────────────────────────
  const setVideo = useCallback((f: File | null) => {
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
      setIsHevc(false);
      setProxyToast(null);
      setTranscription(null);
      setDurationInSeconds(0);
      setStatus("idle");
      return;
    }

    const url = URL.createObjectURL(f);
    originalUrlRef.current = url;

    setVideoFile(f);
    setVideoUrl(url);           // player starts with original
    setOriginalVideoUrl(url);   // export always uses this
    setProxyStatus("idle");
    setNeedsProxy(false);
    setIsHevc(false);
    setTranscription(null);
    setStatus("idle");
    setError(null);

    console.log(
      "[SnipCaptions:store] video selected ·",
      f.name, f.type,
      (f.size / 1024 / 1024).toFixed(1) + "MB",
      "url=", url,
    );

    // Probe duration and resolution to decide whether to generate a proxy
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      const duration = probe.duration || 0;
      const w = probe.videoWidth;
      const h = probe.videoHeight;

      console.log(
        "[SnipCaptions:store] video metadata · duration=", duration,
        "· resolution=", `${w}x${h}`,
      );
      setDurationInSeconds(duration);

      // Save whether a proxy is needed to trigger it during transcription
      if (w >= PROXY_THRESHOLD_PX || h >= PROXY_THRESHOLD_PX) {
        setNeedsProxy(true);
        console.log("[SnipCaptions:proxy] High-res video detected — proxy will run concurrently with transcription.");
      } else {
        setNeedsProxy(false);
        console.log("[SnipCaptions:proxy] Sub-1080p video — skipping proxy generation");
        setProxyStatus("idle");
      }
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

    // Process the proxy concurrently on the same time transcription is happening
    let proxyPromise = Promise.resolve();
    if (needsProxy && proxyStatus === "idle") {
      proxyPromise = generateProxy(videoFile, originalVideoUrl || videoUrl || "", durationInSeconds);
    }

    try {
      const transcribePromise = transcribeVideo({
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

      // Wait for both to complete before proceeding, ensuring the processing popup stays visible.
      const [result] = await Promise.all([transcribePromise, proxyPromise]);
      console.log("[SnipCaptions:store] transcription and proxy success · words=", result.words.length, "language=", result.language);
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
  }, [videoFile, apiKey, language, durationInSeconds, needsProxy, proxyStatus, generateProxy, originalVideoUrl, videoUrl]);

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
    setVideo,
    proxyStatus,
    isHevc,
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
