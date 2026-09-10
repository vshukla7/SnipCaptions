"use client";

import React, { useState } from "react";
import type { ExportMethod } from "@/lib/exportEngine";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: ExportMethod) => void;
  width: number;
  height: number;
  fps?: number;
  durationInSeconds?: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  width,
  height,
  fps = 60,
  durationInSeconds = 0,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<ExportMethod>("playback");

  if (!isOpen) return null;

  const durationStr = durationInSeconds > 0
    ? `${Math.floor(durationInSeconds / 60)}m ${Math.round(durationInSeconds % 60)}s`
    : "Video duration";

  const handleStart = () => {
    onConfirm(selectedMethod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#141418] p-6 text-white shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2997FF]/20 to-[#0066CC]/20 border border-[#2997FF]/30 text-[#2997FF]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export Video</h3>
              <p className="text-xs text-white/50">Select your preferred rendering method</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Options */}
        <div className="mt-5 space-y-3">
          {/* Method 1: Real-Time Playback Stream Capture */}
          <div
            onClick={() => setSelectedMethod("playback")}
            className={`group relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
              selectedMethod === "playback"
                ? "border-[#2997FF] bg-[#2997FF]/[0.08] shadow-lg shadow-[#2997FF]/10 ring-1 ring-[#2997FF]/40"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">⚡</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Fast Real-Time (1x)</span>
                    <span className="rounded-full bg-[#30D158]/15 px-2 py-0.5 text-[10px] font-bold text-[#30D158] border border-[#30D158]/30">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">
                    Captures frames at natural 1x playback. Export time equals your video length (
                    <span className="font-semibold text-white/80">~{durationStr}</span>).
                  </p>
                </div>
              </div>
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                  selectedMethod === "playback"
                    ? "border-[#2997FF] bg-[#2997FF]"
                    : "border-white/30"
                }`}
              >
                {selectedMethod === "playback" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </div>

          {/* Method 2: Deterministic Frame Seek */}
          <div
            onClick={() => setSelectedMethod("seek")}
            className={`group relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
              selectedMethod === "seek"
                ? "border-[#2997FF] bg-[#2997FF]/[0.08] shadow-lg shadow-[#2997FF]/10 ring-1 ring-[#2997FF]/40"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Frame-Accurate Seek</span>
                    <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold text-white/60 border border-white/[0.12]">
                      EXACT
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">
                    Seeks every frame individually for 100% mathematical precision. Slower on some devices.
                  </p>
                </div>
              </div>
              <div
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                  selectedMethod === "seek"
                    ? "border-[#2997FF] bg-[#2997FF]"
                    : "border-white/30"
                }`}
              >
                {selectedMethod === "seek" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </div>
        </div>

        {/* Export Specs Info */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2.5 text-[11px] text-white/50">
          <span>Resolution: <strong className="text-white/80">{width} × {height}</strong></span>
          <span>Framerate: <strong className="text-white/80">{fps} fps</strong></span>
          <span>Codec: <strong className="text-[#2997FF]">H.264 GPU</strong></span>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2997FF] to-[#0066CC] px-5 py-2 text-xs font-bold text-white shadow-lg shadow-[#2997FF]/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Start Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};
