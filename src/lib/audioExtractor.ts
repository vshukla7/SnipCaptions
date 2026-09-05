/**
 * Audio Extraction Engine (Zero-FFmpeg)
 * Extracts and downmixes audio from any HTML5-compatible video container
 * into a lightweight 16kHz Mono 16-bit PCM WAV buffer using native Web Audio API.
 * Asynchronous, sub-second execution with zero main-thread freezing.
 */

export interface AudioExtractionProgress {
  stage: "decoding" | "resampling" | "encoding" | "done";
  progress: number;
}

/**
 * Encodes Float32 mono audio PCM data into a standard 16-bit PCM WAV ArrayBuffer.
 */
export function encodeWav16kHzMono(samples: Float32Array, sampleRate = 16000): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // 1. RIFF Chunk Descriptor
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // Total file length minus 8
  writeString(8, "WAVE");

  // 2. fmt sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // 1 = Mono
  view.setUint32(24, sampleRate, true);  // 16000 Hz
  view.setUint32(28, byteRate, true);    // 32000 bytes/sec
  view.setUint16(32, blockAlign, true);  // 2 bytes
  view.setUint16(34, 16, true);          // 16 bits per sample

  // 3. data sub-chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // 4. Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Convert float (-1.0 to 1.0) to 16-bit signed integer (-32768 to 32767)
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

/**
 * Extracts audio from a video file, resamples to 16kHz Mono, and returns a lightweight WAV File.
 */
export async function extractAudio16kHzMonoWav(
  videoFile: File | Blob,
  fileName = "audio_16khz.wav",
  onProgress?: (p: AudioExtractionProgress) => void,
): Promise<{ file: File; duration: number; rawBuffer: AudioBuffer }> {
  console.time("[AudioExtractor] total");
  onProgress?.({ stage: "decoding", progress: 0.1 });

  // 1. Read array buffer
  const arrayBuffer = await videoFile.arrayBuffer();
  onProgress?.({ stage: "decoding", progress: 0.3 });

  // 2. Decode audio data using an offline/temporary AudioContext
  // Using AudioContext or webkitAudioContext
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error("Web Audio API is not supported in this browser.");
  }

  const audioCtx = new AudioCtxClass();
  let decodedBuffer: AudioBuffer;
  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    try {
      await audioCtx.close();
    } catch {
      /* ignore */
    }
  }

  onProgress?.({ stage: "resampling", progress: 0.6 });

  const duration = decodedBuffer.duration;
  const targetSampleRate = 16000;
  const targetLength = Math.ceil(duration * targetSampleRate);

  // 3. Resample and mix to mono using OfflineAudioContext
  const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decodedBuffer;

  // If source is stereo or multi-channel, OfflineAudioContext automatically downmixes to 1 channel (mono)
  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  onProgress?.({ stage: "encoding", progress: 0.85 });

  // 4. Extract mono channel float32 data & encode to WAV
  const monoChannelData = renderedBuffer.getChannelData(0);
  const wavBuffer = encodeWav16kHzMono(monoChannelData, targetSampleRate);

  const outFileName = fileName.endsWith(".wav") ? fileName : `${fileName.replace(/\.[^/.]+$/, "")}.wav`;
  const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
  const wavFile = new File([wavBlob], outFileName, { type: "audio/wav" });

  onProgress?.({ stage: "done", progress: 1.0 });
  console.timeEnd("[AudioExtractor] total");
  console.log(
    `[AudioExtractor] Extracted 16kHz mono WAV: ${(wavFile.size / 1024).toFixed(1)} KB (vs original video ${(videoFile.size / 1024 / 1024).toFixed(1)} MB) · Duration: ${duration.toFixed(2)}s`,
  );

  return {
    file: wavFile,
    duration,
    rawBuffer: decodedBuffer,
  };
}
