import type { CaptionThemeId } from "@/lib/types";
import type { PixiThemeContext } from "./types";

import { renderCleanTheme } from "./CleanTemplate";
import { renderNeonTheme } from "./NeonTemplate";
import { renderKineticTheme } from "./KineticTemplate";
import { renderHighlightTheme } from "./HighlightTemplate";
import { renderSnipcapSpecialTheme } from "./SnipcapSpecialTemplate";
import { renderBlackPunchTheme } from "./BlackPunchTemplate";
import { renderLiquidGlassTheme } from "./LiquidGlassTemplate";
import { renderOneWordTheme } from "./OneWordTemplate";
import { renderKinetic01Theme } from "./Kinetic01Template";
import { renderDualLineGlowTheme } from "./DualLineGlowTemplate";
import { renderMinimalBlendTheme } from "./MinimalBlendTemplate";
import { renderMinimalBlurBlendTheme } from "./MinimalBlurBlendTemplate";
import { renderPremiereGlowTheme } from "./PremiereGlowTemplate";

export const PIXI_THEMES: Partial<Record<CaptionThemeId, (ctx: PixiThemeContext) => void>> = {
  clean: renderCleanTheme,
  neon: renderNeonTheme,
  kinetic: renderKineticTheme,
  highlight: renderHighlightTheme,
  snipcap_special: renderSnipcapSpecialTheme,
  black_punch: renderBlackPunchTheme,
  liquid_glass: renderLiquidGlassTheme,
  one_word: renderOneWordTheme,
  kinetic_01: renderKinetic01Theme,
  dual_line_glow: renderDualLineGlowTheme,
  minimal_blend: renderMinimalBlendTheme,
  minimal_blur_blend: renderMinimalBlurBlendTheme,
  premiere_glow: renderPremiereGlowTheme,
};

export {
  renderCleanTheme,
  renderNeonTheme,
  renderKineticTheme,
  renderHighlightTheme,
  renderSnipcapSpecialTheme,
  renderBlackPunchTheme,
  renderLiquidGlassTheme,
  renderOneWordTheme,
  renderKinetic01Theme,
  renderDualLineGlowTheme,
  renderMinimalBlendTheme,
  renderMinimalBlurBlendTheme,
  renderPremiereGlowTheme,
};
