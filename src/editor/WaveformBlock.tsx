import React, { useEffect, useRef, useState } from "react";
import type { VideoScene } from "../remotion/types";
import { drawWaveformCanvas, fetchAudioWaveform, generateWordWaveform } from "./waveform";

type Props = {
  scene: VideoScene;
  mediaBase?: string;
  width: number;
  height?: number;
  color?: string;
};

export const WaveformBlock: React.FC<Props> = ({
  scene,
  mediaBase = "",
  width,
  height = 24,
  color = "#38bdf8",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [peaks, setPeaks] = useState<Float32Array>(() =>
    generateWordWaveform(scene.words, scene.srcDuration)
  );

  useEffect(() => {
    let cancelled = false;
    fetchAudioWaveform(scene.file, mediaBase).then((decodedPeaks) => {
      if (cancelled) return;
      if (decodedPeaks.length > 0) {
        setPeaks(decodedPeaks);
      } else {
        setPeaks(generateWordWaveform(scene.words, scene.srcDuration));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mediaBase, scene.file, scene.words, scene.srcDuration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;

    canvas.width = Math.max(10, Math.round(width));
    canvas.height = height;

    drawWaveformCanvas({
      canvas,
      peaks,
      segments: scene.segments,
      color,
      height,
    });
  }, [peaks, scene.segments, width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      className="block-waveform"
      style={{
        width,
        height,
        position: "absolute",
        left: 0,
        bottom: 2,
        pointerEvents: "none",
        opacity: 0.82,
      }}
    />
  );
};
