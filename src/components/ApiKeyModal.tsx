"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDraft(apiKey);
  }, [apiKey]);

  const close = () => {
    setResult(null);
    onClose();
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setValidating(true);
    setResult(null);
    try {
      const ok = await validateApiKey(trimmed);
      if (ok) {
        setApiKey(trimmed);
        setResult("ok");
        // Automatically save & close on validation success
        setTimeout(() => {
          close();
        }, 400);
      } else {
        setResult("bad");
      }
    } catch {
      setResult("bad");
    } finally {
      setValidating(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#1C1C1E] p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-white tracking-tight">
                Gemini API Key
              </h2>
              <button
                onClick={close}
                className="rounded-full p-1 text-white/40 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-[13px] text-white/50 mb-4">
              Enter your Gemini API key. When validated, it will be saved directly to your browser.
            </p>

            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[14px] font-mono text-white outline-none placeholder:text-white/20 focus:border-[#2997FF]"
            />

            {result === "ok" && (
              <p className="mt-3 text-[13px] font-medium text-[#30D158]">
                ✓ Validated & saved successfully!
              </p>
            )}
            {result === "bad" && (
              <p className="mt-3 text-[13px] font-medium text-[#FF453A]">
                ✕ Invalid API key. Please check key.
              </p>
            )}

            <div className="mt-6 flex items-center justify-between">
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#2997FF] hover:underline"
              >
                Get free key →
              </a>

              <div className="flex gap-2">
                <button
                  onClick={close}
                  className="rounded-xl px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={validating || draft.trim().length === 0}
                  className="rounded-xl bg-[#2997FF] px-5 py-2 text-[13px] font-semibold text-white transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {validating ? "Validating…" : "Save Key"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
