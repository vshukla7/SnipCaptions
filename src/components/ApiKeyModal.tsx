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
            className="w-full max-w-md rounded-3xl border border-white/[0.06] bg-[#1C1C1E] p-6"
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-[17px] font-semibold text-white">
                  Gemini API Key
                </h2>
                <p className="mt-1 text-[13px] text-white/40">
                  Stored in your browser only. Never sent to our servers.
                </p>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="AIza…"
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#2997FF]/40"
            />

            {result === "ok" && (
              <p className="mt-3 text-[13px] text-[#30D158]">
                ✓ Key validated successfully
              </p>
            )}
            {result === "bad" && (
              <p className="mt-3 text-[13px] text-[#FF453A]">
                ✕ Could not validate this key
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={close}
                className="rounded-xl px-4 py-2 text-[13px] font-medium text-white/50 transition-colors hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={validating || draft.trim().length === 0}
                className="rounded-xl bg-[#2997FF] px-5 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-30"
              >
                {validating ? "Validating…" : "Save Key"}
              </button>
            </div>

            <p className="mt-4 text-[11px] text-white/25">
              Get a free key at{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2997FF] underline"
              >
                aistudio.google.com/apikey
              </a>
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
