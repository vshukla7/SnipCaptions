export const RENDER_WORKER_CODE = `
  let ffmpegInstance = null;

  self.onmessage = async (e) => {
    const { type, data } = e.data;

    if (type === "start") {
      const {
        chunkIndex,
        videoFile,
        startTime,
        endTime,
        width,
        height,
        fps,
        words,
        theme,
        accentColor,
        position,
        scale,
        customFontFamily,
        origin
      } = data;

      try {
        self.postMessage({ type: "status", chunkIndex, status: "loading" });

        // Load FFmpeg.wasm v0.11.6 from local directory dynamically
        if (!self.FFmpeg) {
          importScripts(origin + "/ffmpeg/ffmpeg.min.js");
        }

        const { createFFmpeg } = self.FFmpeg;
        
        ffmpegInstance = createFFmpeg({
          log: true,
          corePath: origin + "/ffmpeg/ffmpeg-core-st.js"
        });

        await ffmpegInstance.load();
        self.postMessage({ type: "status", chunkIndex, status: "extracting" });

        // Write the original video file to FFmpeg's MEMFS
        const videoBuffer = await videoFile.arrayBuffer();
        ffmpegInstance.FS("writeFile", "input.mp4", new Uint8Array(videoBuffer));

        // Extract video frames for the specified range as JPEG images
        const startStr = startTime.toFixed(3);
        const durationStr = (endTime - startTime).toFixed(3);
        
        await ffmpegInstance.run(
          "-ss", startStr,
          "-t", durationStr,
          "-i", "input.mp4",
          "-f", "image2",
          "-q:v", "3",
          "frame%04d.jpg"
        );

        // Scan directory for extracted frames
        const files = ffmpegInstance.FS("readdir", "/");
        const frameFiles = files
          .filter(f => f.startsWith("frame") && f.endsWith(".jpg"))
          .sort();

        const totalFrames = frameFiles.length;
        self.postMessage({ type: "status", chunkIndex, status: "rendering", total: totalFrames, current: 0 });

        if (totalFrames === 0) {
          throw new Error("No frames extracted for chunk " + chunkIndex);
        }

        // Setup OffscreenCanvas
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Loop through each extracted frame file, draw, overlay subtitles, and re-encode
        for (let i = 0; i < totalFrames; i++) {
          const filename = frameFiles[i];
          const fileData = ffmpegInstance.FS("readFile", filename);

          // Decode frame to ImageBitmap
          const blob = new Blob([fileData], { type: "image/jpeg" });
          const bitmap = await createImageBitmap(blob);

          // Draw base video frame
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(bitmap, 0, 0, width, height);

          // Overlay Subtitles
          const frameTime = startTime + (i / fps);
          drawCaptions(ctx, words, frameTime, width, height, theme, accentColor, position, scale, customFontFamily);

          // Compress canvas back to JPEG
          const renderedBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
          const renderedBuffer = await renderedBlob.arrayBuffer();
          const renderedFilename = "rendered" + i.toString().padStart(4, "0") + ".jpg";
          
          ffmpegInstance.FS("writeFile", renderedFilename, new Uint8Array(renderedBuffer));

          // Strict memory cleanup
          bitmap.close();
          ffmpegInstance.FS("unlink", filename); // delete raw input frame

          if (i % 5 === 0 || i === totalFrames - 1) {
            self.postMessage({ type: "progress", chunkIndex, current: i + 1, total: totalFrames });
          }
        }

        self.postMessage({ type: "status", chunkIndex, status: "encoding" });

        // Encode the rendered JPEG frames into a chunk MP4 segment
        await ffmpegInstance.run(
          "-f", "image2",
          "-framerate", fps.toString(),
          "-i", "rendered%04d.jpg",
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-preset", "ultrafast",
          "-crf", "26",
          "chunk.mp4"
        );

        // Read compiled segment and send back to main thread
        const outputData = ffmpegInstance.FS("readFile", "chunk.mp4");
        const outBuffer = outputData.buffer;

        self.postMessage({ type: "success", chunkIndex, buffer: outBuffer }, [outBuffer]);

        // Final cleanup of MEMFS inside the worker
        try { ffmpegInstance.FS("unlink", "chunk.mp4"); } catch(e){}
        try { ffmpegInstance.FS("unlink", "input.mp4"); } catch(e){}
        for (let i = 0; i < totalFrames; i++) {
          const renderedFilename = "rendered" + i.toString().padStart(4, "0") + ".jpg";
          try { ffmpegInstance.FS("unlink", renderedFilename); } catch(e){}
        }

      } catch (err) {
        console.error("Worker error in chunk " + chunkIndex, err);
        self.postMessage({ type: "error", chunkIndex, error: err.message || String(err) });
      } finally {
        if (ffmpegInstance) {
          try {
            ffmpegInstance.exit();
          } catch(e){}
          ffmpegInstance = null;
        }
      }
    }
  };

  // Canvas Subtitle Drawing Logic inside Worker
  function drawCaptions(ctx, words, time, canvasWidth, canvasHeight, theme, accentColor, position, scale, customFont) {
    if (!words || words.length === 0) return;

    // 1. Build line grouping (e.g. 3 words per line)
    const maxWordsPerLine = 3;
    const lines = [];
    let buffer = [];
    for (let i = 0; i < words.length; i++) {
      buffer.push(words[i]);
      if (buffer.length >= maxWordsPerLine) {
        lines.push({
          words: buffer,
          text: buffer.map(w => w.word).join(" "),
          start: buffer[0].start,
          end: buffer[buffer.length - 1].end
        });
        buffer = [];
      }
    }
    if (buffer.length > 0) {
      lines.push({
        words: buffer,
        text: buffer.map(w => w.word).join(" "),
        start: buffer[0].start,
        end: buffer[buffer.length - 1].end
      });
    }

    // 2. Handle 'one_word' theme separately
    if (theme === "one_word") {
      let activeWord = null;
      for (let i = 0; i < words.length; i++) {
        if (time >= words[i].start && time < words[i].end) {
          activeWord = words[i];
          break;
        }
      }
      if (!activeWord && words.length > 0) {
        // Find closest fallback word
        activeWord = words[0];
        for (let i = 0; i < words.length; i++) {
          if (time >= words[i].end) activeWord = words[i];
        }
      }
      if (!activeWord) return;

      const fontSize = Math.round(canvasWidth * 0.075) * (scale || 1.0);
      ctx.font = "800 " + fontSize + "px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const x = canvasWidth * (position.x / 100);
      const y = canvasHeight * (position.y / 100);

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = Math.round(fontSize * 0.12);
      ctx.lineJoin = "round";
      ctx.strokeText(activeWord.word, x, y);
      ctx.fillStyle = accentColor || "#ffd60a";
      ctx.fillText(activeWord.word, x, y);
      return;
    }

    // 3. Find active line at current timestamp
    let activeLine = null;
    for (let i = 0; i < lines.length; i++) {
      if (time >= lines[i].start && time < lines[i].end) {
        activeLine = lines[i];
        break;
      }
    }
    if (!activeLine && lines.length > 0) {
      // Find closest fallback line
      activeLine = lines[0];
      for (let i = 0; i < lines.length; i++) {
        if (time >= lines[i].end) activeLine = lines[i];
      }
    }
    if (!activeLine) return;

    // 4. Set font parameters based on theme
    const fontSize = Math.round(canvasWidth * 0.062) * (scale || 1.0);
    let fontName = "Arial, sans-serif";
    if (theme === "neon" || theme === "mr_beast" || theme === "black_punch") {
      fontName = "Impact, sans-serif";
    }

    if (customFont) fontName = customFont;

    ctx.font = "800 " + fontSize + "px " + fontName;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const x = canvasWidth * (position.x / 100);
    const y = canvasHeight * (position.y / 100);

    // Measure word positions to center align the group line
    const spaceWidth = ctx.measureText(" ").width;
    const wordWidths = activeLine.words.map(w => ctx.measureText(w.word).width);
    const totalWidth = wordWidths.reduce((a, b) => a + b, 0) + (activeLine.words.length - 1) * spaceWidth;

    let currentX = x - totalWidth / 2;

    for (let i = 0; i < activeLine.words.length; i++) {
      const wordObj = activeLine.words[i];
      const wordWidth = wordWidths[i];
      const isActive = time >= wordObj.start && time < wordObj.end;

      ctx.save();

      let color = "#FFFFFF";
      let strokeColor = "#000000";
      let drawStroke = true;
      let strokeWidth = Math.round(fontSize * 0.08);

      if (isActive) {
        color = accentColor || "#ffd60a";
      }

      if (theme === "neon") {
        ctx.shadowColor = accentColor || "#00e5ff";
        ctx.shadowBlur = 12;
      } else if (theme === "mr_beast") {
        strokeWidth = Math.round(fontSize * 0.16);
      } else if (theme === "black_punch") {
        color = isActive ? "#000000" : "#FFFFFF";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
      } else if (theme === "highlight") {
        if (isActive) {
          ctx.fillStyle = accentColor || "#ffd60a";
          ctx.fillRect(currentX - 4, y - fontSize / 2 - 2, wordWidth + 8, fontSize + 4);
          color = "#000000";
          drawStroke = false;
        }
      }

      if (drawStroke) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = "round";
        ctx.strokeText(wordObj.word, currentX + wordWidth / 2, y);
      }

      ctx.fillStyle = color;
      ctx.fillText(wordObj.word, currentX + wordWidth / 2, y);

      ctx.restore();
      currentX += wordWidth + spaceWidth;
    }
  }
`;
