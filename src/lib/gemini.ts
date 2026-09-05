import { GoogleGenAI, type GenerateContentConfig, type Part } from "@google/genai";
import type { TranscriptionResult, Word } from "./types";
import { extractAudio16kHzMonoWav } from "./audioExtractor";

export const GEMINI_MODEL = "gemini-3.6-flash";

const TRANSCRIPTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    language: { type: "STRING" },
    text: { type: "STRING" },
    words: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          word: { type: "STRING" },
          start: { type: "NUMBER" },
          end: { type: "NUMBER" },
        },
        required: ["word", "start", "end"],
      },
    },
  },
  required: ["language", "text", "words"],
} as const;

const PROMPT = (language: string) => {
  let langInstruction = `Language preference: ${language}.`;
  if (language === "hi-Latn" || language === "hinglish") {
    langInstruction = `Language preference: Hinglish (Hindi spoken language transcribed strictly using the Roman / English alphabet, e.g. "kya haal hai", "kaise ho aap").
CRITICAL SCRIPT RULE: Transcribe ALL words using Latin/English characters (Hinglish). DO NOT output Devanagari characters.`;
  } else if (language === "hi" || language === "hindi") {
    langInstruction = `Language preference: Hindi (Devanagari script, e.g. "क्या हाल है"). Transcribe all words using native Devanagari script.`;
  } else if (language === "bn") {
    langInstruction = `Language preference: Bengali (বাংলা script). Transcribe in native Bengali script.`;
  } else if (language === "mr") {
    langInstruction = `Language preference: Marathi (मराठी script). Transcribe in native Marathi Devanagari script.`;
  } else if (language === "te") {
    langInstruction = `Language preference: Telugu (తెలుగు script). Transcribe in native Telugu script.`;
  } else if (language === "ta") {
    langInstruction = `Language preference: Tamil (தமிழ் script). Transcribe in native Tamil script.`;
  } else if (language === "gu") {
    langInstruction = `Language preference: Gujarati (ગુજરાતી script). Transcribe in native Gujarati script.`;
  } else if (language === "kn") {
    langInstruction = `Language preference: Kannada (ಕನ್ನಡ script). Transcribe in native Kannada script.`;
  } else if (language === "ml") {
    langInstruction = `Language preference: Malayalam (മലയാളം script). Transcribe in native Malayalam script.`;
  } else if (language === "pa") {
    langInstruction = `Language preference: Punjabi (ਪੰਜਾਬੀ script). Transcribe in native Gurmukhi Punjabi script.`;
  } else if (language === "ur") {
    langInstruction = `Language preference: Urdu (اردو script). Transcribe in native Urdu script.`;
  }

  return `You are a professional high-precision speech-to-text alignment engine for video captions.
Transcribe EVERY spoken word from the audio with ultra-accurate frame-accurate word-level timestamps.
${langInstruction}

STRICT ACCURACY RULES:
- Transcribe ALL spoken words in sequential order without skipping any words, numbers, or exclamations.
- "start": exact time (in seconds with 2-3 decimals) when the speaker begins saying the word.
- "end": exact time (in seconds with 2-3 decimals) when the speaker finishes saying the word.
- "start" of a word MUST be >= "start" of the previous word.
- Keep punctuation attached to words naturally (e.g., "Hello,", "world!").
- Do NOT hallucinate words that are not spoken in the audio.
- Output ONLY the JSON object conforming to the schema.`;
};

function alignAndCleanTimestamps(words: Word[], durationSeconds?: number): Word[] {
  if (!words || words.length === 0) return [];

  // 1. Sort strictly by start time
  const sorted = [...words].sort((a, b) => Number(a.start) - Number(b.start));

  const cleaned: Word[] = [];
  const minDuration = 0.16; // Minimum word duration in seconds (160ms) to ensure clear caption visibility

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    if (!item.word || !item.word.trim()) continue;

    let start = Math.max(0, Number(item.start) || 0);
    let end = Math.max(start + minDuration, Number(item.end) || start + minDuration);

    // Round to 3 decimal places
    start = Math.round(start * 1000) / 1000;
    end = Math.round(end * 1000) / 1000;

    // Fix overlap with previous word
    if (cleaned.length > 0) {
      const prev = cleaned[cleaned.length - 1];
      if (start < prev.start) {
        start = prev.start;
      }
      if (prev.end > start) {
        // Adjust previous word's end to avoid subtitle overlap jitter
        prev.end = Math.max(prev.start + minDuration, start);
      }
    }

    if (end <= start) {
      end = start + minDuration;
    }

    if (durationSeconds && durationSeconds > 0 && end > durationSeconds) {
      end = Math.max(start + minDuration, durationSeconds);
    }

    cleaned.push({
      word: item.word.trim(),
      start,
      end,
    });
  }

  return cleaned;
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "Reply with exactly the single word: ok",
    });
    return Boolean(res.text && res.text.trim().toLowerCase().startsWith("ok"));
  } catch (e) {
    console.error("[SnipCaptions:gemini] validateApiKey error", e);
    return false;
  }
}

export interface TranscribeOptions {
  apiKey: string;
  file: File;
  language: string;
  durationSeconds?: number;
  signal?: AbortSignal;
  onStatus?: (msg: string) => void;
  onProgress?: (p: { progress: number; words: number }) => void;
}

export async function transcribeVideo({
  apiKey,
  file,
  language,
  durationSeconds,
  onStatus,
  onProgress,
}: TranscribeOptions): Promise<TranscriptionResult> {
  const ai = new GoogleGenAI({ apiKey });

  let fileToUpload: File = file;

  // If input file is a video, extract 16kHz mono audio payload via native Web Audio API
  if (file.type.startsWith("video/") || !file.name.toLowerCase().endsWith(".wav")) {
    onStatus?.("Extracting audio payload (Web Audio)…");
    onProgress?.({ progress: 0.05, words: 0 });

    try {
      const extracted = await extractAudio16kHzMonoWav(file, `${file.name.replace(/\.[^/.]+$/, "")}_16khz.wav`, (p) => {
        onProgress?.({ progress: 0.05 + p.progress * 0.1, words: 0 });
      });
      fileToUpload = extracted.file;
      if (!durationSeconds || durationSeconds === 0) {
        durationSeconds = extracted.duration;
      }
    } catch (audioErr) {
      console.warn("[transcribeVideo] Web Audio extraction failed, falling back to original file:", audioErr);
      fileToUpload = file;
    }
  }

  onStatus?.("Uploading audio…");
  onProgress?.({ progress: 0.18, words: 0 });
  const uploaded = await ai.files.upload({ file: fileToUpload });
  onProgress?.({ progress: 0.30, words: 0 });

  try {
    const parts: Part[] = [
      { text: PROMPT(language) },
      {
        fileData: {
          fileUri: uploaded.uri,
          mimeType: uploaded.mimeType,
        },
      },
    ];

    const config: GenerateContentConfig = {
      responseMimeType: "application/json",
      responseSchema: TRANSCRIPTION_SCHEMA,
      temperature: 0.0, // Zero temperature for maximum deterministic audio alignment precision
    };

    onStatus?.("Processing audio with Gemini…");
    onProgress?.({ progress: 0.40, words: 0 });
    let acc = "";
    let lastWordCount = 0;
    const startTime = Date.now();
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [{ parts }],
      config,
    });

    onStatus?.("Transcribing & aligning words…");
    for await (const chunk of stream) {
      acc += chunk.text ?? "";
      const words = (acc.match(/"word"\s*:/g) ?? []).length;
      if (words !== lastWordCount) {
        lastWordCount = words;
      }
      const elapsed = (Date.now() - startTime) / 1000;
      const estimatedDuration = durationSeconds ?? 30;
      const timeProgress = Math.min(0.92, 0.45 + (elapsed / Math.max(estimatedDuration * 2, 8)) * 0.5);
      const contentProgress = Math.min(0.96, 0.45 + (words / Math.max(estimatedDuration * 2, 8)) * 0.5);
      onProgress?.({
        progress: Math.max(timeProgress, contentProgress),
        words,
      });
    }

    const clean = acc.replace(/```json|```/gi, "").trim();
    const parsed = JSON.parse(clean || "{}") as {
      language?: string;
      text?: string;
      words?: Word[];
    };

    if (!parsed.words || parsed.words.length === 0) {
      throw new Error(
        "Gemini returned no words. Try a clearer audio clip or select a different language.",
      );
    }

    const alignedWords = alignAndCleanTimestamps(parsed.words, durationSeconds);

    onProgress?.({ progress: 1, words: alignedWords.length });

    return {
      language: parsed.language ?? language,
      text: parsed.text ?? "",
      words: alignedWords,
    };
  } finally {
    try {
      if (uploaded.name) await ai.files.delete({ name: uploaded.name });
    } catch {
      /* best effort cleanup */
    }
  }
}
