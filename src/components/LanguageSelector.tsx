"use client";

import { useApp } from "@/lib/store";
import { LANGUAGES } from "@/lib/types";

export function LanguageSelector() {
  const { language, setLanguage } = useApp();
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--editor-text-muted)]">
      <span className="hidden sm:inline">Language</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--editor-bg)] px-3 py-2 text-sm text-[var(--editor-text)] outline-none focus:border-[var(--editor-accent)]"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
