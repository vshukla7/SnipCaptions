"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export function SetupGuideModal({
  open,
  onClose,
  onOpenApiKeyModal,
}: {
  open: boolean;
  onClose: () => void;
  onOpenApiKeyModal?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#1C1C1E] p-6 shadow-2xl"
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-white tracking-tight">
                Setup Guide
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1 text-white/40 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Clean Steps List */}
            <div className="space-y-4 text-[13px]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">
                    1. Open Google AI Studio
                  </h3>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-[#2997FF] hover:underline"
                  >
                    Open Studio ↗
                  </a>
                </div>
                <p className="text-white/40 mt-0.5 text-[12px]">
                  Sign in with your free Google account.
                </p>
              </div>

              <div className="border-t border-white/[0.06] pt-3">
                <h3 className="font-semibold text-white">
                  2. Create API Key
                </h3>
                <p className="text-white/40 mt-0.5 text-[12px]">
                  Click "Create API Key" and copy the key string.
                </p>
              </div>

              <div className="border-t border-white/[0.06] pt-3">
                <h3 className="font-semibold text-white">
                  3. Paste & Save Key
                </h3>
                <p className="text-white/40 mt-0.5 text-[12px]">
                  Click "Add API Key" in the top bar and paste your key.
                </p>
              </div>
            </div>

            {/* Action footer */}
            <div className="mt-6 flex justify-end gap-2 border-t border-white/[0.06] pt-4">
              <button
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-[13px] font-medium text-white/60 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenApiKeyModal?.();
                }}
                className="rounded-xl bg-[#2997FF] px-5 py-2 text-[13px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Add API Key
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
