import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CoverSettings, Project } from "./types";
import { FPS } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const CoverLayer: React.FC<{ project: Project }> = ({ project }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cover: CoverSettings | undefined = project.cover;
  if (!cover || !cover.enabled || !cover.title?.trim()) return null;

  const durationFrames = Math.max(1, Math.round((cover.durationSeconds ?? 0.1) * FPS));
  if (frame >= durationFrames) return null;

  // Animação de saída caso a capa tenha mais de 6 frames
  const exitFrames = Math.min(8, Math.max(1, Math.floor(durationFrames / 3)));
  const exit = durationFrames > 4
    ? interpolate(frame, [durationFrames - exitFrames, durationFrames], [1, 0], clamp)
    : 1;

  // Spring de entrada
  const sp = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });

  const u = Math.min(width, height) / 1080;
  const scale = cover.fontSize ?? 1.1;
  const style = cover.style || "hormozi";
  const pos = cover.position || "center";
  const darken = Math.max(0, Math.min(0.95, cover.darken ?? 0.45));
  const blur = Math.max(0, Math.min(20, cover.blur ?? 0));

  const alignStyles: React.CSSProperties =
    pos === "top"
      ? { justifyContent: "flex-start", paddingTop: height * 0.14 }
      : pos === "bottom"
      ? { justifyContent: "flex-end", paddingBottom: height * 0.22 }
      : { justifyContent: "center" };

  const fontFamily =
    cover.fontFamily === "TheBoldFont"
      ? "'The Bold Font', 'Impact', sans-serif"
      : cover.fontFamily === "Impact"
      ? "Impact, sans-serif"
      : cover.fontFamily === "Montserrat"
      ? "'Montserrat', sans-serif"
      : cover.fontFamily === "BebasNeue"
      ? "'Bebas Neue', sans-serif"
      : "Inter, ui-sans-serif, system-ui, sans-serif";

  const titleText = cover.uppercase !== false ? cover.title.toUpperCase() : cover.title;
  const subtitleText = cover.subtitle ? (cover.uppercase !== false ? cover.subtitle.toUpperCase() : cover.subtitle) : "";

  return (
    <AbsoluteFill
      style={{
        zIndex: 45,
        pointerEvents: "none",
        opacity: exit,
      }}
    >
      {/* Camada de escurecimento e vinheta para legibilidade máxima */}
      {darken > 0 ? (
        <AbsoluteFill
          style={{
            backgroundColor: `rgba(0, 0, 0, ${darken})`,
            backgroundImage: `radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, ${Math.min(1, darken + 0.35)}) 100%)`,
            backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
          }}
        />
      ) : null}

      {/* Conteúdo da Capa */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: `0 ${width * 0.08}px`,
          ...alignStyles,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            width: "100%",
            maxWidth: width * 0.88,
            transform: `scale(${0.92 + 0.08 * sp}) translateY(${(1 - sp) * 20}px)`,
            fontFamily,
          }}
        >
          {/* Subtítulo / Badge de Categoria */}
          {subtitleText ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: `${12 * u}px ${28 * u}px`,
                borderRadius: style === "box" ? 0 : 9999,
                fontSize: 26 * u * scale,
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 20 * u,
                ...(style === "hormozi"
                  ? {
                      backgroundColor: cover.color || "#ffd84d",
                      color: "#121319",
                      boxShadow: "0 4px 20px rgba(255, 216, 77, 0.4)",
                    }
                  : style === "mrbeast"
                  ? {
                      backgroundColor: "#22c55e",
                      color: "#080c14",
                      boxShadow: "0 6px 24px rgba(34, 197, 94, 0.5)",
                      border: `${3 * u}px solid #000`,
                    }
                  : style === "neon"
                  ? {
                      backgroundColor: "rgba(236, 72, 153, 0.25)",
                      color: "#fdf4ff",
                      border: `${2.5 * u}px solid #ec4899`,
                      boxShadow: "0 0 20px rgba(236, 72, 153, 0.6)",
                    }
                  : style === "box"
                  ? {
                      backgroundColor: "#000000",
                      color: cover.color || "#ffd84d",
                      borderLeft: `${6 * u}px solid ${cover.color || "#ffd84d"}`,
                      padding: `${8 * u}px ${20 * u}px`,
                    }
                  : {
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      color: "#ffffff",
                      backdropFilter: "blur(8px)",
                      border: `1px solid rgba(255, 255, 255, 0.25)`,
                    }),
              }}
            >
              {subtitleText}
            </div>
          ) : null}

          {/* Título Principal de Alto Impacto (CTR / Viral) */}
          <div
            style={{
              fontSize: 68 * u * scale,
              lineHeight: 1.08,
              fontWeight: 900,
              letterSpacing: style === "minimal" ? "0.02em" : "-0.03em",
              ...(style === "hormozi"
                ? {
                    color: cover.textColor || "#ffffff",
                    WebkitTextStroke: `${Math.max(4, 10 * u * scale)}px #000000`,
                    paintOrder: "stroke fill",
                    textShadow: `0 ${10 * u}px ${28 * u}px rgba(0, 0, 0, 0.9)`,
                  }
                : style === "mrbeast"
                ? {
                    color: "#ffffff",
                    WebkitTextStroke: `${Math.max(4, 12 * u * scale)}px #000000`,
                    paintOrder: "stroke fill",
                    textShadow: `0 ${8 * u}px ${20 * u}px rgba(0, 0, 0, 0.95)`,
                    transform: "rotate(-1.5deg)",
                  }
                : style === "neon"
                ? {
                    color: "#ffffff",
                    textShadow: `0 0 ${20 * u}px #ec4899, 0 0 ${45 * u}px #ec4899, 0 ${4 * u}px ${16 * u}px rgba(0, 0, 0, 0.9)`,
                  }
                : style === "box"
                ? {
                    backgroundColor: "#000000",
                    color: cover.textColor || "#ffffff",
                    padding: `${16 * u}px ${30 * u}px`,
                    boxShadow: `0 ${10 * u}px ${32 * u}px rgba(0, 0, 0, 0.9)`,
                    borderLeft: `${8 * u}px solid ${cover.color || "#ffd84d"}`,
                  }
                : {
                    color: cover.textColor || "#ffffff",
                    textShadow: `0 ${4 * u}px ${18 * u}px rgba(0, 0, 0, 0.8)`,
                  }),
            }}
          >
            {titleText}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
