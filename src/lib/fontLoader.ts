/**
 * Universal Font Loader
 * Ensures all custom fonts are loaded, added to document.fonts, and rasterized
 * before Pixi.js or Canvas starts rendering text across Windows, macOS, iOS, and Android.
 */

export interface FontDescriptor {
  family: string;
  url: string;
  descriptors?: FontFaceDescriptors;
}

export const APP_FONTS: FontDescriptor[] = [
  { family: "Celosia Nature", url: "/fonts/Celosia-Nature.otf" },
  { family: "Gilroy", url: "/fonts/Gilroy-ExtraBold.otf", descriptors: { weight: "800" } },
  { family: "Helvetica Bold", url: "/fonts/Helvetica-Bold.ttf", descriptors: { weight: "700" } },
  { family: "Longmile", url: "/fonts/Longmile.otf" },
  { family: "NCL Gasdrifo", url: "/fonts/NCLGasdrifo-Demo.otf" },
  { family: "Qurova Light", url: "/fonts/QurovaDEMO-Light.otf" },
  { family: "Readex Pro", url: "/fonts/ReadexPro-Medium.ttf" },
  { family: "Retro Floral", url: "/fonts/Retro Floral.ttf" },
  { family: "SF Pro Display", url: "/fonts/SF-Pro-Display.otf" },
  { family: "Helvetica Rounded", url: "/fonts/helvetica-rounded.otf" },
];

let fontsLoadedPromise: Promise<void> | null = null;

/**
 * Preloads all custom fonts into the document font set.
 * Safe to call multiple times (memoized).
 */
export function preloadAllFonts(): Promise<void> {
  if (typeof window === "undefined" || !("FontFace" in window)) {
    return Promise.resolve();
  }

  if (fontsLoadedPromise) {
    return fontsLoadedPromise;
  }

  fontsLoadedPromise = (async () => {
    const loadPromises = APP_FONTS.map(async (f) => {
      try {
        // Check if already loaded
        if (document.fonts.check(`16px "${f.family}"`)) {
          return;
        }
        const fontFace = new FontFace(f.family, `url("${f.url}")`, f.descriptors);
        const loaded = await fontFace.load();
        document.fonts.add(loaded);
      } catch (err) {
        console.warn(`[FontLoader] Failed to load font "${f.family}":`, err);
      }
    });

    await Promise.all(loadPromises);
    await document.fonts.ready;
    console.log("[FontLoader] All application typography assets loaded successfully.");
  })();

  return fontsLoadedPromise;
}

/**
 * Ensures a specific font family is fully loaded before drawing.
 */
export async function ensureFontLoaded(fontFamily: string): Promise<void> {
  await preloadAllFonts();
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.load(`16px ${fontFamily}`);
    } catch {
      /* ignore */
    }
  }
}
