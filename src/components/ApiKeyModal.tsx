"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/store";
import { validateApiKey } from "@/lib/gemini";

export function ApiKeyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { apiKey, setApiKey } = useApp();
  const [draft, setDraft] = useState(apiKey);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<"ok" | "bad" | null>(null);

  const close = () => {
    setResult(null);
    onClose();
  };

  const save = async () => {
    setApiKey(draft.trim());
    setValidating(true);
    setResult(null);
    try {
      const ok = await validateApiKey(draft.trim());
      setResult(ok ? "ok" : "bad");
    } catch {
      setResult("bad");
    } finally {
      setValidating(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--editor-panel)] p-6"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--editor-text)]">
                  Gemini API Key
                </h2>
                <p className="mt-1 text-sm text-[var(--editor-text-muted)]">
                  Stored only in your browser. Never sent to our servers.
                </p>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1 text-[var(--editor-text-muted)] hover:bg-[var(--editor-card)]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="AIza…"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--editor-bg)] px-4 py-3 text-sm text-[var(--editor-text)] outline-none focus:border-[var(--editor-accent)]"
            />

            {result === "ok" ? (
              <p className="mt-3 text-sm text-[var(--success)]">
                ✓ Key validated successfully.
              </p>
            ) : null}
            {result === "bad" ? (
              <p className="mt-3 text-sm text-[var(--destructive-2)]">
                ✕ Could not validate this key. Check it and your network/CORS
                settings.
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={close}
                className="rounded-xl px-4 py-2 text-sm font-medium text-[var(--editor-text-muted)] hover:bg-[var(--editor-card)]"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={validating || draft.trim().length === 0}
                className="rounded-xl bg-[var(--editor-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {validating ? "Validating…" : "Save Key"}
              </button>
            </div>

            <p className="mt-4 text-xs text-[var(--editor-text-muted)]">
              Get a free key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-blue)] underline"
              >
                aistudio.google.com/apikey
              </a>
              . Enable &quot;All origins / CORS&quot; if required.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
