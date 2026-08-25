"use client";

import { CAPTION_THEMES } from "@/lib/types";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { captionTheme, setCaptionTheme } = useApp();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CAPTION_THEMES.map((t) => {
        const active = t.id === captionTheme;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setCaptionTheme(t.id)}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
              active
                ? "border-[var(--editor-accent)] bg-[var(--editor-card)]"
                : "border-[var(--border)] bg-[var(--editor-panel)] hover:border-[var(--editor-accent)]/60",
            )}
          >
            <div
              className="mb-2 flex h-14 items-end justify-center rounded-lg bg-black/40 p-2"
              style={{ boxShadow: active ? `inset 0 0 0 1px ${t.accent}` : undefined }}
            >
              <span
                className={cn(t.fontClass, "text-base font-bold leading-none")}
                style={{ color: t.accent }}
              >
                Aa
              </span>
            </div>
            <p className="text-sm font-medium text-[var(--editor-text)]">
              {t.name}
            </p>
            <p className="mt-0.5 text-xs text-[var(--editor-text-muted)]">
              {t.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
