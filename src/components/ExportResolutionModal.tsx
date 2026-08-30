"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export function ExportResolutionModal({
  open,
  onClose,
  resolution,
  onChangeResolution,
  onProceed,
}: {
  open: boolean;
  onClose: () => void;
  resolution: "1080p" | "720p" | "540p";
  onChangeResolution: (res: "1080p" | "720p" | "540p") => void;
  onProceed: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
      // Check if AudioEncoder is missing (typical Safari/iOS Safari)
      const lacksAudioEncoder = !("AudioEncoder" in window);
      setIsSafari(lacksAudioEncoder);
    }
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#1C1C1E] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-bold text-white tracking-tight">
                Export Options
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

            <p className="text-[13px] text-white/50 mb-5 leading-normal">
              Select the desired resolution for your exported video. Higher resolutions offer sharper output but take longer and consume more device resources.
            </p>

            {/* Resolution Profile Selection */}
            <div className="space-y-2 mb-5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Resolution Profile
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/[0.08]">
                {(["1080p", "720p", "540p"] as const).map((res) => {
                  const active = resolution === res;
                  return (
                    <button
                      key={res}
                      type="button"
                      onClick={() => onChangeResolution(res)}
                      className={`rounded-xl py-2.5 text-center text-[12px] font-bold transition-all ${
                        active
                          ? "bg-[#2997FF] text-white shadow-lg shadow-[#2997FF]/15"
                          : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      {res}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Guidance Warning Banner */}
            {isMobile && (
              <div className="mb-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] leading-relaxed text-white/70">
                <div className="flex gap-2 items-start">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffd60a" strokeWidth="2.5" className="shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <span className="font-semibold text-white">Mobile Optimization Tip:</span>{" "}
                    720p or 540p is recommended for mobile web export. 1080p renders are highly resource-intensive and may cause web browser memory crashes.
                  </div>
                </div>
              </div>
            )}

            {isSafari && (
              <div className="mb-5 rounded-2xl border border-[#2997FF]/15 bg-[#2997FF]/5 p-4 text-[12px] leading-relaxed text-white/70">
                <div className="flex gap-2 items-start">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2997FF" strokeWidth="2.5" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <span className="font-semibold text-white">iOS Safari Audio Support:</span>{" "}
                    We will compile the video muted and automatically restore/merge the original audio stream locally in your browser using single-threaded FFmpeg.
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.06] py-3 text-[14px] font-semibold text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  // Let the transition complete or call immediately
                  setTimeout(() => {
                    onProceed();
                  }, 100);
                }}
                className="flex-1 rounded-2xl bg-gradient-to-r from-[#2997FF] to-[#0066CC] py-3 text-[14px] font-semibold text-white shadow-lg shadow-[#2997FF]/25 hover:shadow-[#2997FF]/35 transition-all"
              >
                Start Export
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
