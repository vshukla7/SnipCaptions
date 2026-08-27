"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/store";
import { validateApiKey } from "@/lib/gemini";

export function TutorialVideoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { setApiKey } = useApp();
  const [mounted, setMounted] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"ok" | "bad" | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setKeyInput("");
      setValidationResult(null);
      setValidating(false);
    }
  }, [open]);

  const handleSaveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;

    setValidating(true);
    setValidationResult(null);
    try {
      const ok = await validateApiKey(trimmed);
      if (ok) {
        setApiKey(trimmed);
        setValidationResult("ok");
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setValidationResult("bad");
      }
    } catch {
      setValidationResult("bad");
    } finally {
      setValidating(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl rounded-3xl border border-white/[0.08] bg-[#1C1C1E] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-bold text-white tracking-tight">
                  Gemini API Key Required
                </h2>
                <p className="text-[12px] text-white/40 mt-0.5">
                  Follow this quick tutorial to get and set up your free key.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-white/40 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Responsive Video Embed Container */}
            <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-black border border-white/[0.08] shadow-inner">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/E1qDJVRJU2w?autoplay=1"
                title="Gemini API Setup Tutorial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>

            {/* Quick Key Activation Form */}
            <div className="border-t border-white/[0.06] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Connect API Key
                </label>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#2997FF] hover:underline"
                >
                  Get free key ↗
                </a>
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Paste your API key here (AIzaSy...)"
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[13px] font-mono text-white outline-none focus:border-[#2997FF] placeholder:text-white/20"
                />
                <button
                  onClick={handleSaveKey}
                  disabled={validating || keyInput.trim().length === 0}
                  className="rounded-xl bg-[#2997FF] px-4 py-2.5 text-[13px] font-semibold text-white transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98] shrink-0"
                >
                  {validating ? "Connecting..." : "Connect"}
                </button>
              </div>

              {validationResult === "ok" && (
                <p className="text-[12px] font-medium text-[#30D158] flex items-center gap-1 animate-pulse">
                  ✓ Validated & connected successfully! Closing...
                </p>
              )}
              {validationResult === "bad" && (
                <p className="text-[12px] font-medium text-[#FF453A] flex items-center gap-1">
                  ✕ Invalid API key. Please check the key and try again.
                </p>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-[12px] font-semibold text-white/50 hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
