"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { ApiKeyModal } from "./ApiKeyModal";

export function Header() {
  const { hasApiKey, status } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/70 border-b border-white/[0.04]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2.5">
          <img src="/snipCaptions.svg" alt="" className="h-7 w-7 rounded-lg" />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            SnipCaptions
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/blogs"
            className="hidden rounded-full px-4 py-1.5 text-[13px] font-medium text-white/60 transition-colors hover:text-white sm:block"
          >
            Blog
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200"
            style={{
              background: hasApiKey ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.06)",
              color: hasApiKey ? "#30D158" : "#8E8E93",
              border: `1px solid ${hasApiKey ? "rgba(48,209,88,0.2)" : "rgba(255,255,255,0.06)"}`,
            }}
          >
            {hasApiKey ? "✓ Connected" : "Add API Key"}
          </button>
        </div>
      </div>
      <ApiKeyModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </header>
  );
}
