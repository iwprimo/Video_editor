import React from "react";
import type { BackgroundPresetId, BgRemovalConfig, ImageAsset } from "./types";

type Props = {
  config: BgRemovalConfig;
  assets?: ImageAsset[];
  mediaBase?: string;
  width?: number;
  height?: number;
};

export const VirtualBackground: React.FC<Props> = ({
  config,
  assets,
  mediaBase = "",
}) => {
  const {
    backgroundType = "preset",
    presetId = "podcast-studio",
    backgroundColor = "#0f172a",
    blurBackground = true,
    blurAmount = 14,
    sceneBrightness = 0.85,
    customAssetId,
    customFile,
  } = config;

  const blurStyle = blurBackground ? `blur(${blurAmount}px)` : "none";
  const brightnessStyle = `brightness(${sceneBrightness})`;

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    inset: -20, // leve sangria para compensar o desfoque nas bordas
    overflow: "hidden",
    pointerEvents: "none",
    filter: `${blurStyle} ${brightnessStyle}`,
    transform: "scale(1.05)",
  };

  if (backgroundType === "color") {
    return (
      <div style={containerStyle}>
        <div style={{ width: "100%", height: "100%", backgroundColor }} />
      </div>
    );
  }

  if (backgroundType === "image") {
    const customAsset = customAssetId ? assets?.find((a) => a.id === customAssetId) : undefined;
    const imgSrc = customAsset
      ? `${mediaBase}/media/${customAsset.file}`
      : customFile
      ? `${mediaBase}/media/${customFile}`
      : null;

    if (imgSrc) {
      return (
        <div style={containerStyle}>
          <img
            src={imgSrc}
            alt="Cenário de fundo"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      );
    }
  }

  // Presets visuais com CSS & SVG nativos de alta fidelidade
  return (
    <div style={containerStyle}>
      {renderPreset(presetId)}
    </div>
  );
};

const renderPreset = (id: BackgroundPresetId) => {
  switch (id) {
    case "podcast-studio":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "radial-gradient(circle at 50% 45%, #2a2035 0%, #110e19 55%, #08060d 100%)",
            position: "relative",
          }}
        >
          {/* Painéis acústicos e ripas verticais */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.18,
              backgroundImage:
                "repeating-linear-gradient(90deg, #ffd84d 0px, #ffd84d 14px, transparent 14px, transparent 44px)",
            }}
          />
          {/* Feixe de luz âmbar central */}
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "25%",
              width: "50%",
              height: "70%",
              background: "radial-gradient(ellipse at center, rgba(255, 175, 64, 0.28) 0%, transparent 70%)",
            }}
          />
          {/* Linhas verticais de neon nos cantos */}
          <div
            style={{
              position: "absolute",
              left: "12%",
              top: "15%",
              bottom: "15%",
              width: 3,
              background: "#ff9f43",
              boxShadow: "0 0 25px 8px rgba(255, 159, 67, 0.4)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "12%",
              top: "15%",
              bottom: "15%",
              width: 3,
              background: "#38bdf8",
              boxShadow: "0 0 25px 8px rgba(56, 189, 248, 0.4)",
            }}
          />
        </div>
      );

    case "modern-office":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(180deg, #1e293b 0%, #0f172a 60%, #020617 100%)",
            position: "relative",
          }}
        >
          {/* Janela executiva de vidro com horizonte urbano */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 60% 30%, rgba(148, 163, 184, 0.25) 0%, transparent 60%)",
            }}
          />
          {/* Linhas de vidro arquitetônico */}
          <div
            style={{
              position: "absolute",
              left: "35%",
              top: 0,
              bottom: 0,
              width: 2,
              background: "rgba(255, 255, 255, 0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "70%",
              top: 0,
              bottom: 0,
              width: 2,
              background: "rgba(255, 255, 255, 0.12)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: 0,
              right: 0,
              height: 2,
              background: "rgba(255, 255, 255, 0.12)",
            }}
          />
          {/* Luz suave de horizonte matinal */}
          <div
            style={{
              position: "absolute",
              bottom: "20%",
              left: 0,
              right: 0,
              height: "25%",
              background: "linear-gradient(0deg, rgba(56, 189, 248, 0.12) 0%, transparent 100%)",
            }}
          />
        </div>
      );

    case "neon-loft":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "radial-gradient(circle at 50% 50%, #15102a 0%, #080612 100%)",
            position: "relative",
          }}
        >
          {/* Efeito tijolo escuro sutil */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.12,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "60px 24px",
            }}
          />
          {/* Luz Neon Ciano na Esquerda */}
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "-10%",
              width: "45%",
              height: "80%",
              background: "radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, transparent 70%)",
            }}
          />
          {/* Luz Neon Magenta na Direita */}
          <div
            style={{
              position: "absolute",
              top: "15%",
              right: "-10%",
              width: "45%",
              height: "80%",
              background: "radial-gradient(circle, rgba(236, 72, 153, 0.35) 0%, transparent 70%)",
            }}
          />
        </div>
      );

    case "warm-bookshelf":
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(180deg, #1c130c 0%, #0d0805 100%)",
            position: "relative",
          }}
        >
          {/* Prateleiras de madeira rústica */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.22,
              backgroundImage:
                "linear-gradient(0deg, #e5a758 1px, transparent 1px), repeating-linear-gradient(90deg, #e5a758 0px, #e5a758 8px, transparent 8px, transparent 24px)",
              backgroundSize: "100% 70px, 32px 70px",
            }}
          />
          {/* Glow de abajur quente */}
          <div
            style={{
              position: "absolute",
              top: "20%",
              right: "20%",
              width: "40%",
              height: "50%",
              background: "radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, transparent 70%)",
            }}
          />
        </div>
      );

    case "studio-gradient":
    default:
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "radial-gradient(circle at 50% 40%, #1e293b 0%, #0f172a 50%, #020617 100%)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "20%",
              right: "20%",
              bottom: "20%",
              background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)",
            }}
          />
        </div>
      );
  }
};
