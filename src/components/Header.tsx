"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { ApiKeyModal } from "./ApiKeyModal";
import { SetupGuideModal } from "./SetupGuideModal";

export function Header() {
  const { hasApiKey, status, progress, reset, transcription, openDemoStudio, studioActions } = useApp();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const showStudio = status === "ready" || status === "exporting" || Boolean(transcription);

  return (
    <header className="sticky top-0 z-40 h-14 bg-[#0A0A0C]/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-3 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/snipCaptions.svg" alt="" className="h-7 w-7 rounded-lg" />
          <div className="flex flex-col leading-none">
            <span className="text-[14px] sm:text-[15px] font-bold tracking-tight text-white">
              SnipCaptions
            </span>
            <span className="text-[10px] font-medium text-white/40 tracking-tight mt-0.5 hidden xs:block sm:block">
              by ayphic
            </span>
          </div>
          {/* {showStudio && (
            <span className="hidden md:inline-block rounded-full bg-[#2997FF]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#2997FF] border border-[#2997FF]/20">
              Studio Mode
            </span>
          )} */}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {showStudio && (
            <button
              onClick={reset}
              className="rounded-full bg-white/[0.06] px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-[12px] font-medium text-white/80 transition-all hover:bg-white/[0.12] hover:text-white"
            >
              <span className="hidden sm:inline">+ New Video</span>
              <span className="sm:hidden">+ Video</span>
            </button>
          )}
          {/* {!showStudio && (
            <button
              onClick={openDemoStudio}
              className="rounded-full bg-[#2997FF]/10 border border-[#2997FF]/30 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-[12px] font-semibold text-[#2997FF] transition-all hover:bg-[#2997FF]/20"
            >
              <span className="hidden sm:inline">Studio Preview</span>
              <span className="sm:hidden">Preview</span>
            </button>
          )} */}
          {showStudio && studioActions && (
            <>
              <button
                onClick={studioActions.onDownloadSRT}
                disabled={status === "exporting"}
                title="Download SRT subtitles"
                className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 sm:px-3 py-1.5 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                SRT
              </button>
              <button
                onClick={studioActions.onExport}
                disabled={status === "exporting"}
                title="Export video with captions"
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2997FF] to-[#0066CC] px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg shadow-[#2997FF]/25 transition-all disabled:opacity-40"
              >
                {status === "exporting" ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{Math.round(progress * 100)}%</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Export</span>
                  </>
                )}
              </button>
            </>
          )}
          {!hasApiKey && (
            <button
              onClick={() => setGuideModalOpen(true)}
              className="rounded-full px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-[12px] font-medium text-white/70 transition-colors hover:text-white hover:bg-white/[0.06]"
            >
              <span className="hidden sm:inline">Setup Guide</span>
              <span className="sm:hidden">Guide</span>
            </button>
          )}

          {!showStudio && <button
            onClick={() => setApiKeyModalOpen(true)}
            className="rounded-full px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 text-[12px] font-semibold transition-all duration-200"
            style={{
              background: hasApiKey ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.06)",
              color: hasApiKey ? "#30D158" : "#8E8E93",
              border: `1px solid ${hasApiKey ? "rgba(48,209,88,0.25)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            {hasApiKey ? (
              <>
                <span className="hidden sm:inline">✓ API Connected</span>
                <span className="sm:hidden">✓ Connected</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Add API Key</span>
                <span className="sm:hidden">Add Key</span>
              </>
            )}
          </button>}
        </div>
      </div>

      <ApiKeyModal open={apiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} />
      <SetupGuideModal
        open={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
      />
    </header>
  );
}
