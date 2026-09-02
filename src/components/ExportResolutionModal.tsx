"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

export type ExportPreset = "original" | "1080p" | "720p" | "540p";

export function ExportResolutionModal({
  open,
  onClose,
  originalWidth,
  originalHeight,
  onProceed,
}: {
  open: boolean;
  onClose: () => void;
  originalWidth: number;
  originalHeight: number;
  onProceed: (preset: ExportPreset) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>("1080p");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSelectedPreset("720p");
      }
      // Check if AudioEncoder is missing (typical Safari/iOS Safari)
      const lacksAudioEncoder = !("AudioEncoder" in window);
      setIsSafari(lacksAudioEncoder);
    }
  }, []);

  if (!mounted) return null;

  const aspect = originalWidth > 0 && originalHeight > 0 ? originalWidth / originalHeight : 9 / 16;
  const isLandscape = aspect > 1;

  const getPresetDimensions = (preset: ExportPreset) => {
    if (preset === "original") return { w: originalWidth, h: originalHeight };
    const shortSide = preset === "1080p" ? 1080 : preset === "720p" ? 720 : 540;
    if (isLandscape) {
      const h = shortSide;
      const w = Math.round((shortSide * aspect) / 2) * 2;
      return { w, h };
    } else {
      const w = shortSide;
      const h = Math.round((shortSide / aspect) / 2) * 2;
      return { w, h };
    }
  };

  const presets: { id: ExportPreset; label: string; desc: string; badge?: string }[] = [
    {
      id: "1080p",
      label: "1080p Full HD",
      desc: "Optimal balance of sharpness & render speed",
      badge: "Recommended",
    },
    {
      id: "720p",
      label: "720p HD",
      desc: "~2.5x faster render, highly fluid playback",
      badge: "Fast",
    },
    {
      id: "540p",
      label: "540p Mobile",
      desc: "~4.5x ultra-fast render, minimal memory footprint",
      badge: "Ultra Fast",
    },
    {
      id: "original",
      label: "Original Source",
      desc: `Raw source quality (${originalWidth} × ${originalHeight})`,
    },
  ];

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
          <div
            className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#1C1C1E] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[18px] font-bold text-white tracking-tight">
                Export Resolution & Speed
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

            <p className="text-[12px] text-white/50 mb-4 leading-normal">
              Select your export resolution profile. Lowering resolution exponentially accelerates client-side WebCodecs encoding.
            </p>

            {/* Resolution Profile Selection */}
            <div className="space-y-2 mb-5">
              {presets.map((p) => {
                const isSelected = selectedPreset === p.id;
                const { w, h } = getPresetDimensions(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset(p.id)}
                    className={`w-full rounded-2xl p-3 border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-[#2997FF] bg-[#2997FF]/10 shadow-lg shadow-[#2997FF]/10"
                        : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-white">{p.label}</span>
                        {p.badge && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            p.id === "1080p" ? "bg-[#2997FF]/20 text-[#2997FF]" : "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40 mt-0.5">{p.desc}</span>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="text-[11px] font-mono text-white/60 bg-white/[0.06] px-2 py-1 rounded-md">
                        {w} × {h}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Guidance Warning Banner */}
            {isMobile && (
              <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200/90">
                <div className="flex gap-2 items-start">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <span className="font-semibold text-white">Mobile Web Tip:</span> 720p or 540p renders up to 4x faster on mobile devices and avoids browser memory limits.
                  </div>
                </div>
              </div>
            )}

            {isSafari && (
              <div className="mb-4 rounded-2xl border border-[#2997FF]/20 bg-[#2997FF]/10 p-3 text-[11px] leading-relaxed text-white/80">
                <div className="flex gap-2 items-start">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2997FF" strokeWidth="2.5" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <span className="font-semibold text-white">iOS Safari Audio:</span> Original audio will be auto-muxed back in post-render via browser FFmpeg.
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.06] py-2 text-[13px] font-semibold text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    onProceed(selectedPreset);
                  }, 100);
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#2997FF] to-[#0066CC] py-2 text-[13px] font-semibold text-white shadow-lg shadow-[#2997FF]/25 hover:shadow-[#2997FF]/35 transition-all"
              >
                Start Fast Export
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
