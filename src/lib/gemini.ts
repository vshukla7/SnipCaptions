import { GoogleGenAI, type GenerateContentConfig, type Part } from "@google/genai";
import type { TranscriptionResult, Word } from "./types";

export const GEMINI_MODEL = "Gemini 3.5 Flash-Lite";

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
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: "Reply with exactly the single word: ok",
    });
    return Boolean(res.text && res.text.trim().toLowerCase().startsWith("ok"));
  } catch {
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

  onStatus?.("Uploading media to Gemini…");
  const uploaded = await ai.files.upload({ file });

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

    onStatus?.("Transcribing audio with Gemini…");
    // Stream the response so we can show real, incremental progress.
    const estimatedTotal = Math.max(1, Math.round((durationSeconds ?? 30) * 2.5));
    let acc = "";
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: [{ parts }],
      config,
    });

    for await (const chunk of stream) {
      acc += chunk.text ?? "";
      const words = (acc.match(/"word"/g) ?? []).length;
      onProgress?.({
        progress: Math.min(0.95, words / estimatedTotal),
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
