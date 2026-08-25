"use client";

import { cn } from "@/lib/utils";

/**
 * Placeholder ad banner (FR-06). Swap the inner content for AdSense /
 * Adsterra / Google Ad Manager tags in production.
 */
export function AdBanner({
  variant = "footer",
  label = "Advertisement",
}: {
  variant?: "header" | "footer" | "sidebar";
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center border border-dashed border-[var(--border)] bg-[var(--editor-panel)] text-[var(--editor-text-muted)]",
        variant === "header" || variant === "footer"
          ? "h-16 rounded-xl"
          : "min-h-64 rounded-xl",
      )}
      aria-label={label}
    >
      <span className="px-4 text-center text-xs uppercase tracking-widest opacity-70">
        {label} · 728×90 / 300×250
      </span>
    </div>
  );
}

/**
 * Full-screen interstitial shown during transcription / export waits (FR-06).
 */
export function AdInterstitial({
  open,
  title,
  progress,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex h-[70vh] w-[90vw] max-w-3xl flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--editor-panel)] p-6">
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-[var(--editor-text-muted)]">
          <span className="text-sm uppercase tracking-widest opacity-70">
            Interstitial Advertisement · 300×600
          </span>
        </div>
        {typeof progress === "number" ? (
          <div className="w-full max-w-md">
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--editor-text-muted)]">
              <span>{title ?? "Generating captions…"}</span>
              <span>
                {pct}%{words ? ` · ${words} words` : ""}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--editor-card)]">
              <div
                className="h-full rounded-full bg-[var(--brand-blue)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
