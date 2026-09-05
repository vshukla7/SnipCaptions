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

export interface VideoValidationResult {
  supported: boolean;
  reason?: string;
  isH264?: boolean;
}

/**
 * Validates video container and codec format for hardware-accelerated rendering.
 * Detects unsupported containers (MKV, raw ProRes MOV) and verifies H.264/WebM compatibility.
 */
export async function validateVideoContainerAndCodec(file: File): Promise<VideoValidationResult> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  // 1. Check container extension & mime type
  if (fileName.endsWith(".mkv") || fileType.includes("matroska")) {
    return {
      supported: false,
      reason: "Matroska (.MKV) containers cannot be decoded directly by browser hardware. Please upload an .MP4 or .WebM video.",
    };
  }

  if (fileName.endsWith(".avi") || fileType.includes("x-msvideo") || fileName.endsWith(".wmv")) {
    return {
      supported: false,
      reason: "Legacy AVI/WMV containers are not supported for hardware rendering. Please upload an .MP4 video.",
    };
  }

  try {
    // Read first 2MB chunk to probe MP4 atoms and codec signatures
    const startBuffer = await file.slice(0, 2 * 1024 * 1024).arrayBuffer();
    const startBytes = new Uint8Array(startBuffer);

    let hasAvc = false;
    let hasHevc = false;
    let hasProRes = false;

    // Helper to match 4-byte ASCII signature
    const match4 = (bytes: Uint8Array, i: number, sig: string) => {
      return (
        bytes[i] === sig.charCodeAt(0) &&
        bytes[i + 1] === sig.charCodeAt(1) &&
        bytes[i + 2] === sig.charCodeAt(2) &&
        bytes[i + 3] === sig.charCodeAt(3)
      );
    };

    for (let i = 0; i < startBytes.length - 4; i++) {
      // H.264: "avc1", "avc3"
      if (match4(startBytes, i, "avc1") || match4(startBytes, i, "avc3")) {
        hasAvc = true;
      }
      // HEVC: "hvc1", "hev1"
      if (match4(startBytes, i, "hvc1") || match4(startBytes, i, "hev1")) {
        hasHevc = true;
      }
      // Apple ProRes: "apcn", "apch", "apco", "ap4h", "ap4x"
      if (
        match4(startBytes, i, "apcn") ||
        match4(startBytes, i, "apch") ||
        match4(startBytes, i, "apco") ||
        match4(startBytes, i, "ap4h") ||
        match4(startBytes, i, "ap4x")
      ) {
        hasProRes = true;
      }
    }

    // Check end chunk if moov atom was not found at start
    if (!hasAvc && !hasHevc && !hasProRes && file.size > 2 * 1024 * 1024) {
      const endBuffer = await file.slice(file.size - 2 * 1024 * 1024).arrayBuffer();
      const endBytes = new Uint8Array(endBuffer);
      for (let i = 0; i < endBytes.length - 4; i++) {
        if (match4(endBytes, i, "avc1") || match4(endBytes, i, "avc3")) {
          hasAvc = true;
        }
        if (match4(endBytes, i, "hvc1") || match4(endBytes, i, "hev1")) {
          hasHevc = true;
        }
        if (
          match4(endBytes, i, "apcn") ||
          match4(endBytes, i, "apch") ||
          match4(endBytes, i, "apco") ||
          match4(endBytes, i, "ap4h") ||
          match4(endBytes, i, "ap4x")
        ) {
          hasProRes = true;
        }
      }
    }

    if (hasProRes) {
      return {
        supported: false,
        reason: "Apple ProRes encoded .MOV files cannot be played in browser WebGL pipelines. Please export your video using standard H.264 (MP4).",
      };
    }

    if (hasHevc && !hasAvc) {
      // Check if browser video element can play HEVC
      const videoTest = document.createElement("video");
      const canPlayHevc = videoTest.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"');
      if (!canPlayHevc) {
        return {
          supported: false,
          reason: "H.265 / HEVC is not supported by your browser's hardware decoder. Please convert to standard H.264 (MP4).",
        };
      }
    }

    return {
      supported: true,
      isH264: hasAvc,
    };
  } catch (err) {
    console.warn("[validateVideoContainerAndCodec] Warning during container probe:", err);
    // Allow standard fallback if inspection failed
    return { supported: true, isH264: true };
  }
}

export async function detectH264Codec(file: File): Promise<boolean> {
  const result = await validateVideoContainerAndCodec(file);
  return result.supported;
}
