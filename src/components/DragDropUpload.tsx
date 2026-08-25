"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

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
      <motion.div
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
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          dragging
            ? "border-[var(--editor-accent)] bg-[var(--editor-card)]"
            : "border-[var(--border)] bg-[var(--editor-panel)] hover:border-[var(--editor-accent)]/60",
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--editor-card)] text-2xl">
          ⬆
        </div>
        <p className="text-base font-medium text-[var(--editor-text)]">
          Drag &amp; drop your video here
        </p>
        <p className="mt-1 text-sm text-[var(--editor-text-muted)]">
          or click to browse · MP4, MOV, WEBM · up to 2 minutes
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </motion.div>

      {videoFile ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--editor-panel)] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--editor-text)]">
              {videoFile.name}
            </p>
            <p className="text-xs text-[var(--editor-text-muted)]">
              {(videoFile.size / 1024 / 1024).toFixed(1)} MB
              {busy ? " · processing…" : ""}
            </p>
          </div>
          <button
            onClick={() => setVideo(null)}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--destructive-2)] hover:bg-[var(--editor-card)] disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
