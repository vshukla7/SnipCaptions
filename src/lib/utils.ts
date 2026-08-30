export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data URL prefix
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export async function detectH264Codec(file: File): Promise<boolean> {
  try {
    // Read first 2MB of the file
    const startBuffer = await file.slice(0, 2 * 1024 * 1024).arrayBuffer();
    const startBytes = new Uint8Array(startBuffer);

    let hasAvc = false;
    let hasHevc = false;

    // Search for codec signatures in the start chunk
    for (let i = 0; i < startBytes.length - 4; i++) {
      // "avc1" (H.264) -> [0x61, 0x76, 0x63, 0x31]
      if (startBytes[i] === 0x61 && startBytes[i+1] === 0x76 && startBytes[i+2] === 0x63 && startBytes[i+3] === 0x31) {
        hasAvc = true;
      }
      // "hvc1" (HEVC) -> [0x68, 0x76, 0x63, 0x31]
      if (startBytes[i] === 0x68 && startBytes[i+1] === 0x76 && startBytes[i+2] === 0x63 && startBytes[i+3] === 0x31) {
        hasHevc = true;
      }
      // "hev1" (HEVC) -> [0x68, 0x65, 0x76, 0x31]
      if (startBytes[i] === 0x68 && startBytes[i+1] === 0x65 && startBytes[i+2] === 0x76 && startBytes[i+3] === 0x31) {
        hasHevc = true;
      }
    }

    // If moov is at the end of the file, read the last 2MB as well
    if (!hasAvc && !hasHevc && file.size > 2 * 1024 * 1024) {
      const endBuffer = await file.slice(file.size - 2 * 1024 * 1024).arrayBuffer();
      const endBytes = new Uint8Array(endBuffer);
      for (let i = 0; i < endBytes.length - 4; i++) {
        if (endBytes[i] === 0x61 && endBytes[i+1] === 0x76 && endBytes[i+2] === 0x63 && endBytes[i+3] === 0x31) {
          hasAvc = true;
        }
        if (endBytes[i] === 0x68 && endBytes[i+1] === 0x76 && endBytes[i+2] === 0x63 && endBytes[i+3] === 0x31) {
          hasHevc = true;
        }
        if (endBytes[i] === 0x68 && endBytes[i+1] === 0x65 && endBytes[i+2] === 0x76 && endBytes[i+3] === 0x31) {
          hasHevc = true;
        }
      }
    }

    // Strictly enforce H.264 (AVC) and reject HEVC/others
    if (hasHevc) return false;
    return hasAvc;
  } catch (e) {
    console.error("[detectH264Codec] Error checking file signature:", e);
    return false;
  }
}

