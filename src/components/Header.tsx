"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { ApiKeyModal } from "./ApiKeyModal";
import { SetupGuideModal } from "./SetupGuideModal";

export function Header() {
  const { hasApiKey, status, reset, transcription, openDemoStudio } = useApp();
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
          {showStudio && (
            <span className="hidden md:inline-block rounded-full bg-[#2997FF]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#2997FF] border border-[#2997FF]/20">
              Studio Mode
            </span>
          )}
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
         

          <button
            onClick={() => setGuideModalOpen(true)}
            className="rounded-full px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-[12px] font-medium text-white/70 transition-colors hover:text-white hover:bg-white/[0.06]"
          >
            <span className="hidden sm:inline">Setup Guide</span>
            <span className="sm:hidden">Guide</span>
          </button>

          <Link
            href="/blogs"
            className="hidden rounded-full px-3 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:text-white sm:block"
          >
            Blog
          </Link>

          <button
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
          </button>
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
