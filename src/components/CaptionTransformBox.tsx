"use client";

import React, { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useApp } from "@/lib/store";

interface CaptionTransformBoxProps {
  containerWidth: number;
  containerHeight: number;
}

export function CaptionTransformBox({
  containerWidth,
  containerHeight,
}: CaptionTransformBoxProps) {
  const { captionPosition, setCaptionPosition, captionScale, setCaptionScale } =
    useApp();

  const containerRef = useRef<HTMLDivElement | null>(null);
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
    const boxW = Math.min(containerWidth * 0.75, 320);
    const boxH = 50;

    // Create clean styled transform box rect representing captions
    const rect = new fabric.Rect({
      left: initialLeft,
      top: initialTop,
      width: boxW,
      height: boxH,
      originX: "center",
      originY: "center",
      fill: "transparent",
      stroke: "#2997FF",
      strokeWidth: 1.5,
      rx: 8,
      ry: 8,
      cornerColor: "#2997FF",
      cornerStrokeColor: "#ffffff",
      cornerStyle: "circle",
      cornerSize: 10,
      transparentCorners: false,
      padding: 4,
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

    // Smart pointer-events toggling: only intercept mouse when hovering near transform box
    let isDragging = false;
    canvas.on("mouse:down", () => {
      isDragging = true;
    });
    canvas.on("mouse:up", () => {
      isDragging = false;
    });

    const handleWindowMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      const obj = activeObjRef.current;
      if (!container || !obj) return;

      if (isDragging) {
        container.style.pointerEvents = "auto";
        return;
      }

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Always pass pointer events through to Remotion controls in bottom 50px area
      if (mouseY > containerHeight - 50) {
        container.style.pointerEvents = "none";
        return;
      }

      const bound = obj.getBoundingRect();
      const margin = 15;

      const isOverBox =
        mouseX >= bound.left - margin &&
        mouseX <= bound.left + bound.width + margin &&
        mouseY >= bound.top - margin &&
        mouseY <= bound.top + bound.height + margin;

      container.style.pointerEvents = isOverBox ? "auto" : "none";
    };

    window.addEventListener("mousemove", handleWindowMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
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
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: containerWidth, height: containerHeight }}
    >
      <canvas ref={canvasElRef} className="absolute inset-0" />
    </div>
  );
}
