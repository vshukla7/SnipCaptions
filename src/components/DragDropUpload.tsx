"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/store";

export function DragDropUpload() {
  const { videoFile, setVideo, status } = useApp();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const busy = status === "transcribing" || status === "exporting";

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("video/")) {
      alert("Please choose a video file (mp4, webm, mov).");
      return;
    }
    setVideo(file);
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {!videoFile ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className="group cursor-pointer rounded-2xl border border-dashed p-10 text-center transition-all duration-300"
            style={{
              borderColor: dragging ? "#2997FF" : "rgba(255,255,255,0.08)",
              background: dragging ? "rgba(41,151,255,0.04)" : "rgba(255,255,255,0.02)",
            }}
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300"
              style={{
                background: dragging ? "rgba(41,151,255,0.12)" : "rgba(255,255,255,0.04)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#2997FF" : "#8E8E93"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-white/90">
              Drop your video here
            </p>
            <p className="mt-1.5 text-[13px] text-white/40">
              or click to browse · MP4, MOV, WEBM
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2997FF]/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2997FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white/90">
                {videoFile.name}
              </p>
              <p className="text-[11px] text-white/40">
                {(videoFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            {!busy && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setVideo(null);
                }}
                className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
