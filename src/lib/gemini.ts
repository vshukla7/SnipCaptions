import { GoogleGenAI, type GenerateContentConfig, type Part } from "@google/genai";
import type { TranscriptionResult, Word } from "./types";

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

const PROMPT = (language: string) => `You are a speech-to-text engine for short-form video.
Transcribe ALL spoken audio from the provided media file.
Language preference: ${language}.

Requirements:
- Return word-level timestamps in SECONDS with at least 2 decimals.
- "start" and "end" mark when each word is spoken.
- Keep punctuation attached to the correct word (e.g. "word,").
- If multiple speakers, still list every word in order.
- Output ONLY the JSON object described by the schema. Do not wrap it in markdown.`;

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    console.log("[SnipCaptions:gemini] validateApiKey → calling Gemini");
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "Reply with exactly the single word: ok",
    });
    console.log("[SnipCaptions:gemini] validateApiKey →", res.text);
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

  onStatus?.("Uploading media…");
  onProgress?.({ progress: 0.05, words: 0 });
  console.log("[SnipCaptions:gemini] uploading file:", file.name, file.type, file.size, "· model=", GEMINI_MODEL);
  onProgress?.({ progress: 0.10, words: 0 });
  const uploaded = await ai.files.upload({ file });
  onProgress?.({ progress: 0.25, words: 0 });
  console.log("[SnipCaptions:gemini] uploaded →", uploaded.uri, uploaded.mimeType);

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
      temperature: 0.1,
    };

    onStatus?.("Processing audio…");
    onProgress?.({ progress: 0.35, words: 0 });
    console.log("[SnipCaptions:gemini] starting stream · language=", language, "durationSeconds=", durationSeconds);
    let acc = "";
    let lastWordCount = 0;
    const startTime = Date.now();
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [{ parts }],
      config,
    });

    onStatus?.("Transcribing…");
    for await (const chunk of stream) {
      acc += chunk.text ?? "";
      const words = (acc.match(/"word"\s*:/g) ?? []).length;
      if (words !== lastWordCount) {
        lastWordCount = words;
        console.log("[SnipCaptions:gemini] stream progress · words=", words);
      }
      const elapsed = (Date.now() - startTime) / 1000;
      const estimatedDuration = durationSeconds ?? 30;
      const timeProgress = Math.min(0.90, 0.40 + (elapsed / Math.max(estimatedDuration * 3, 10)) * 0.55);
      const contentProgress = Math.min(0.95, 0.40 + (words / Math.max(estimatedDuration * 2, 10)) * 0.55);
      onProgress?.({
        progress: Math.max(timeProgress, contentProgress),
        words,
      });
    }

    const clean = acc.replace(/```json|```/gi, "").trim();
    console.log("[SnipCaptions:gemini] stream complete · raw length=", acc.length);
    const parsed = JSON.parse(clean || "{}") as {
      language?: string;
      text?: string;
      words?: Word[];
    };
    console.log("[SnipCaptions:gemini] parsed · language=", parsed.language, "wordCount=", parsed.words?.length);

    if (!parsed.words || parsed.words.length === 0) {
      throw new Error(
        "Gemini returned no words. Try a clearer audio clip or a different language.",
      );
    }

    onProgress?.({ progress: 1, words: parsed.words.length });

    return {
      language: parsed.language ?? language,
      text: parsed.text ?? "",
      words: parsed.words,
    };
  } finally {
    try {
      if (uploaded.name) await ai.files.delete({ name: uploaded.name });
    } catch {
      /* best effort cleanup */
    }
  }
}
