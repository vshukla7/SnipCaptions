"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { ApiKeyModal } from "./ApiKeyModal";
import { cn } from "@/lib/utils";

export function Header() {
  const { hasApiKey, transcribe, videoFile, status } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  const busy = status === "transcribing" || status === "exporting";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--editor-border)] bg-[var(--editor-header)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[var(--editor-text)]">
              SnipCaptions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {videoFile && hasApiKey ? (
            <button
              onClick={transcribe}
              disabled={busy}
              className="rounded-xl bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "transcribing" ? "Transcribing…" : "Generate Captions"}
            </button>
          ) : null}

          <button
            onClick={() => setModalOpen(true)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
              hasApiKey
                ? "border-[var(--success)] text-[var(--success)]"
                : "border-[var(--border)] text-[var(--editor-text)] hover:border-[var(--editor-accent)]",
            )}
          >
            {hasApiKey ? "API Key ✓" : "Add API Key"}
          </button>
        </div>
      </div>

      <ApiKeyModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </header>
  );
}
