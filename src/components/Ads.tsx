"use client";

import { cn } from "@/lib/utils";

/**
 * Clean Apple-styled Ad Banner.
 */
export function AdBanner({
  variant = "footer",
  label = "Advertisement",
}: {
  variant?: "header" | "footer" | "sidebar" | "small";
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[#161618] px-4 text-white/50 shadow-inner backdrop-blur-md",
        variant === "small"
          ? "h-11 text-[11px]"
          : variant === "header" || variant === "footer"
          ? "h-14 text-[12px]"
          : "min-h-[250px] flex-col justify-center text-[12px]",
      )}
      aria-label={label}
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#2997FF]">
          Ad
        </span>
        <span className="font-medium text-white/70">{label}</span>
      </div>
      <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
        728×90 / 300×250 Banner Slot
      </span>
    </div>
  );
}

/**
 * Full-screen interstitial ad overlay during caption generation and video export.
 */
export function AdInterstitial({
  open,
  title = "Processing...",
  progress = 0,
  words,
}: {
  open: boolean;
  title?: string;
  progress?: number;
  words?: number;
}) {
  if (!open) return null;
  const pct = Math.round((progress ?? 0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex w-full max-w-xl flex-col items-center gap-6 rounded-3xl border border-white/[0.1] bg-[#1C1C1E] p-8 shadow-2xl">
        {/* Ad Container Box */}
        <div className="flex h-56 w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="rounded-full bg-[#2997FF]/15 px-3 py-1 text-[11px] font-semibold text-[#2997FF]">
              Sponsored Advertisement
            </span>
            <p className="text-[13px] text-white/50">
              Your video is processing on client-side hardware.
            </p>
            <span className="mt-2 text-[10px] font-mono text-white/25 uppercase tracking-widest">
              300×250 / 728×90 Ad Unit
            </span>
          </div>
        </div>

        {/* Progress Display */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-[13px] font-medium text-white/80">
            <span>{title}</span>
            <span className="font-mono text-[#2997FF]">
              {pct}%{words ? ` · ${words} words` : ""}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2997FF] to-[#0066CC] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
