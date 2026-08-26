"use client";

import React, { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useApp } from "@/lib/store";

interface CaptionTransformBoxProps {
  containerWidth: number;
  containerHeight: number;
  activeText?: string;
}

export function CaptionTransformBox({
  containerWidth,
  containerHeight,
  activeText,
}: CaptionTransformBoxProps) {
  const { captionPosition, setCaptionPosition, captionScale, setCaptionScale } =
    useApp();

  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const activeObjRef = useRef<fabric.Rect | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasElRef.current || containerWidth <= 0 || containerHeight <= 0) return;

    // Create fabric canvas
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: containerWidth,
      height: containerHeight,
      selection: false,
      renderOnAddRemove: true,
    });
    fabricCanvasRef.current = canvas;

    // Initial positioning in pixels from percentage
    const initialLeft = (captionPosition.x / 100) * containerWidth;
    const initialTop = (captionPosition.y / 100) * containerHeight;

    // Box dimensions
    const boxW = Math.min(containerWidth * 0.75, 300);
    const boxH = 48;

    // Create styled transform box rect representing captions
    const rect = new fabric.Rect({
      left: initialLeft,
      top: initialTop,
      width: boxW,
      height: boxH,
      originX: "center",
      originY: "center",
      fill: "rgba(41, 151, 255, 0.08)",
      stroke: "#2997FF",
      strokeWidth: 1.5,
      strokeDashArray: [4, 4],
      rx: 10,
      ry: 10,
      cornerColor: "#2997FF",
      cornerStrokeColor: "#ffffff",
      cornerStyle: "circle",
      cornerSize: 10,
      transparentCorners: false,
      padding: 6,
      scaleX: captionScale,
      scaleY: captionScale,
      hasBorders: true,
      borderColor: "#2997FF",
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    activeObjRef.current = rect;

    // Handle modification (moving / scaling)
    const handleModified = () => {
      const obj = activeObjRef.current;
      if (!obj || !canvas) return;

      isInternalUpdateRef.current = true;

      const objLeft = obj.left ?? initialLeft;
      const objTop = obj.top ?? initialTop;

      // Calculate percentage x, y
      const pctX = Math.max(5, Math.min(95, (objLeft / containerWidth) * 100));
      const pctY = Math.max(5, Math.min(95, (objTop / containerHeight) * 100));

      const newScale = Math.max(0.4, Math.min(3.0, obj.scaleX ?? 1));

      setCaptionPosition({ x: Math.round(pctX * 10) / 10, y: Math.round(pctY * 10) / 10 });
      setCaptionScale(Math.round(newScale * 100) / 100);

      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 50);
    };

    canvas.on("object:modified", handleModified);
    canvas.on("object:moving", handleModified);
    canvas.on("object:scaling", handleModified);

    return () => {
      canvas.off("object:modified", handleModified);
      canvas.off("object:moving", handleModified);
      canvas.off("object:scaling", handleModified);
      canvas.dispose();
      fabricCanvasRef.current = null;
      activeObjRef.current = null;
    };
  }, [containerWidth, containerHeight]);

  // Sync canvas size when container dimensions change
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (canvas && containerWidth > 0 && containerHeight > 0) {
      canvas.setDimensions({ width: containerWidth, height: containerHeight });

      const obj = activeObjRef.current;
      if (obj) {
        const newLeft = (captionPosition.x / 100) * containerWidth;
        const newTop = (captionPosition.y / 100) * containerHeight;
        obj.set({ left: newLeft, top: newTop });
        obj.setCoords();
        canvas.renderAll();
      }
    }
  }, [containerWidth, containerHeight, captionPosition.x, captionPosition.y]);

  // Update object when store position / scale changes externally
  useEffect(() => {
    if (isInternalUpdateRef.current) return;
    const canvas = fabricCanvasRef.current;
    const obj = activeObjRef.current;
    if (canvas && obj && containerWidth > 0 && containerHeight > 0) {
      const newLeft = (captionPosition.x / 100) * containerWidth;
      const newTop = (captionPosition.y / 100) * containerHeight;
      obj.set({
        left: newLeft,
        top: newTop,
        scaleX: captionScale,
        scaleY: captionScale,
      });
      obj.setCoords();
      canvas.renderAll();
    }
  }, [captionPosition, captionScale, containerWidth, containerHeight]);

  return (
    <div
      className="absolute inset-0 pointer-events-auto z-20"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <canvas ref={canvasElRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 backdrop-blur-md border border-white/10 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-[#2997FF] animate-pulse" />
        <span className="text-[11px] font-medium text-white/90">
          Fabric.js TransformBox · Drag & scale caption box
        </span>
      </div>
    </div>
  );
}
