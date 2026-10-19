import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DEFAULT_HEADLINE, FPS, Project, VIRAL_FONTS } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const HeadlineLayer: React.FC<{ project: Project }> = ({ project }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const hl = project.headline;

  if (!hl || !hl.enabled || !hl.text.trim()) return null;

  const durationSec = hl.durationSeconds ?? DEFAULT_HEADLINE.durationSeconds;
  const durationFrames = durationSec > 0 ? Math.round(durationSec * FPS) : Infinity;

  // Se a duração for limitada e já passou do tempo, oculta
  if (frame >= durationFrames) return null;

  // Animação de entrada elástica de cima para baixo
  const sp = spring({ frame, fps: FPS, config: { damping: 15, stiffness: 160 } });
  const enterY = interpolate(sp, [0, 1], [-50, 0], clamp);
  const enterScale = interpolate(sp, [0, 1], [0.85, 1], clamp);
  const enterOpacity = Math.min(1, sp * 1.5);

  // Animação suave de saída nos últimos 12 frames
  const exitOpacity =
    durationSec > 0
      ? interpolate(frame, [durationFrames - 12, durationFrames], [1, 0], clamp)
      : 1;
  const exitY =
    durationSec > 0
      ? interpolate(frame, [durationFrames - 12, durationFrames], [0, -25], clamp)
      : 0;

  const fontObj = VIRAL_FONTS.find((f) => f.id === hl.fontFamily || f.name === hl.fontFamily);
  const fontFamily = fontObj ? fontObj.family : "Inter, sans-serif";

  const scale = hl.fontSize ?? 1.0;
  const u = Math.min(width, height) / 1080;
  const baseSize = 42 * u * scale;
  const color = hl.color || project.theme.accent;
  const textColor = hl.textColor || "#121319";
  const upper = hl.uppercase !== false;

  // Posição: dentro da área segura do topo (Reels/TikTok safe zone: top ~13% a 15%)
  const topPos = project.format === "portrait" ? "14%" : "10%";

  const styleType = hl.style || "badge";

  return (
    <div
      style={{
        position: "absolute",
        top: topPos,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${width * 0.08}px`,
        pointerEvents: "none",
        zIndex: 45,
        opacity: enterOpacity * exitOpacity,
        transform: `translateY(${enterY + exitY}px) scale(${enterScale})`,
      }}
    >
      {styleType === "badge" ? (
        <div
          style={{
            background: color,
            color: textColor,
            fontFamily,
            fontSize: baseSize,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            textTransform: upper ? "uppercase" : "none",
            padding: `${baseSize * 0.25}px ${baseSize * 0.65}px`,
            borderRadius: `${baseSize * 0.3}px`,
            textAlign: "center",
            boxShadow: `0 ${baseSize * 0.15}px ${baseSize * 0.5}px rgba(0,0,0,0.45)`,
            maxWidth: "92%",
          }}
        >
          {hl.text}
        </div>
      ) : styleType === "bold" ? (
        <div
          style={{
            color: color || "#fff",
            fontFamily,
            fontSize: baseSize * 1.25,
            fontWeight: 900,
            lineHeight: 1.1,
            textTransform: upper ? "uppercase" : "none",
            textAlign: "center",
            textShadow: `0 3px 0 #000, 0 6px 12px rgba(0,0,0,0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000`,
            maxWidth: "95%",
          }}
        >
          {hl.text}
        </div>
      ) : styleType === "highlight" ? (
        <div
          style={{
            background: "rgba(18, 19, 25, 0.85)",
            border: `2px solid ${color}`,
            color: "#f7f7fa",
            fontFamily,
            fontSize: baseSize,
            fontWeight: 800,
            lineHeight: 1.2,
            textTransform: upper ? "uppercase" : "none",
            padding: `${baseSize * 0.22}px ${baseSize * 0.55}px`,
            borderRadius: 999,
            textAlign: "center",
            boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
            maxWidth: "92%",
          }}
        >
          <span style={{ color }}>{hl.text}</span>
        </div>
      ) : (
        /* neon style */
        <div
          style={{
            color: "#ffffff",
            fontFamily,
            fontSize: baseSize * 1.15,
            fontWeight: 900,
            lineHeight: 1.15,
            textTransform: upper ? "uppercase" : "none",
            textAlign: "center",
            textShadow: `0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`,
            maxWidth: "95%",
          }}
        >
          {hl.text}
        </div>
      )}
    </div>
  );
};
