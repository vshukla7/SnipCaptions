"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { PerformanceMode, HardwareTier } from "@/lib/exportEngine";

export type ExportPreset = "original" | "1080p" | "720p" | "540p";

export interface ExportProceedPayload {
  preset: ExportPreset;
  performanceMode: PerformanceMode;
}

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
  onProceed: (payload: ExportProceedPayload) => void;
  detectedTier?: HardwareTier | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>("1080p");
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("auto");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      if (mobile) {
        setSelectedPreset("720p");
        setPerformanceMode("speed"); // Default to speed mode on mobile
      }
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

  const presets: { id: ExportPreset; label: string; sub: string; badge?: string }[] = [
    {
      id: "1080p",
      label: "1080p",
      sub: "Full HD",
      badge: "Recommended",
    },
    {
      id: "720p",
      label: "720p",
      sub: "HD · Faster",
      badge: "Fast",
    },
    {
      id: "540p",
      label: "540p",
      sub: "SD · Ultra Fast",
    },
    {
      id: "original",
      label: "Original",
      sub: "Source Resolution",
    },
  ];

  const perfModes: {
    id: PerformanceMode;
    icon: string;
    label: string;
    desc: string;
  }[] = [
    {
      id: "auto",
      icon: "⚡",
      label: "Auto",
      desc: "Automatically selects the best speed for your device.",
    },
    {
      id: "quality",
      icon: "🎬",
      label: "Quality",
      desc: "Maximum detail and frame accuracy.",
    },
    {
      id: "speed",
      icon: "🚀",
      label: "Speed",
      desc: "Fastest export, recommended for mobile and low-end PCs.",
    },
  ];

  const modalContent = (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#1C1C1E] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-bold text-white tracking-tight">
                Export Video
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close export modal"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Quality / Resolution Selection */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2">
                Resolution
              </div>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((p) => {
                  const isSelected = selectedPreset === p.id;
                  const { w, h } = getPresetDimensions(p.id);
                  return (
                    <button
                      key={p.id}
                      id={`export-preset-${p.id}`}
                      type="button"
                      onClick={() => setSelectedPreset(p.id)}
                      className={`rounded-2xl p-3 border text-left transition-all relative ${
                        isSelected
                          ? "border-[#2997FF] bg-[#2997FF]/15 text-white"
                          : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-white">{p.label}</span>
                        {p.badge && isSelected && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#2997FF] text-white">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 mt-0.5">{p.sub}</div>
                      <div className="text-[10px] font-mono text-white/40 mt-1">
                        {w} × {h}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Performance Mode / Speed */}
            <div className="mb-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2">
                Export Speed
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {perfModes.map((m) => {
                  const isSelected = performanceMode === m.id;
                  return (
                    <button
                      key={m.id}
                      id={`export-perf-${m.id}`}
                      type="button"
                      onClick={() => setPerformanceMode(m.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 border text-center transition-all ${
                        isSelected
                          ? "border-[#2997FF] bg-[#2997FF]/15 text-white shadow-sm"
                          : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="text-[13px]">{m.icon}</span>
                      <span className="text-[12px] font-bold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-white/50 px-1">
                {perfModes.find((m) => m.id === performanceMode)?.desc}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                id="export-modal-cancel"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 py-2.5 text-[13px] font-semibold text-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="export-modal-start"
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    onProceed({ preset: selectedPreset, performanceMode });
                  }, 100);
                }}
                className="flex-1 rounded-xl bg-[#2997FF] hover:bg-[#0077ED] py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#2997FF]/20 transition-all"
              >
                Export
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
