import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TransitionPresentation } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import { pushCut } from "@remotion/transitions/push-cut";
import type { EffectInstance, EffectType, TransitionSpec } from "./types";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const inOut = Easing.bezier(0.45, 0, 0.55, 1);
const out = Easing.bezier(0.22, 1, 0.36, 1);

// ---------- Transições (biblioteca oficial @remotion/transitions) ----------

export const makePresentation = (t: TransitionSpec, width: number, height: number): TransitionPresentation<any> => {
  switch (t.type) {
    case "slide":
      return slide({ direction: t.direction });
    case "wipe":
      return wipe({ direction: t.direction });
    case "flip":
      return flip({ direction: t.direction });
    case "clockWipe":
      return clockWipe({ width, height });
    case "iris":
      return iris({ width, height });
    case "pushCut":
      return pushCut({ flashColor: "#fffaf0" });
    case "fade":
    default:
      return fade();
  }
};

// ---------- Efeitos ----------

type Props = {
  effects: EffectInstance[];
  duration: number;
  background?: React.ReactNode;
  children: React.ReactNode;
};

const has = (effects: EffectInstance[], type: EffectType) => effects.find((e) => e.type === type);

// Aplica câmera, cor e sobreposições a uma cena (ou ao vídeo inteiro)
export const EffectsLayer: React.FC<Props> = ({ effects, duration, background, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const D = Math.max(1, duration);
  const p = Math.min(1, Math.max(0, frame / D));

  // Câmera (transforma só o conteúdo, o fundo fica parado)
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let rot = 0;
  const contentFilters: string[] = [];

  for (const e of effects) {
    const k = e.intensity;
    switch (e.type) {
      case "zoomIn":
        scale *= 1 + 0.14 * k * inOut(p);
        break;
      case "zoomOut":
        scale *= 1 + 0.14 * k * (1 - inOut(p));
        break;
      case "pan":
        tx += interpolate(p, [0, 1], [-1, 1]) * 70 * k * u;
        break;
      case "shake":
        tx += (Math.sin(frame * 0.53) + 0.6 * Math.sin(frame * 1.37 + 1.2) + 0.3 * Math.sin(frame * 3.1)) * 7 * k * u;
        ty += (Math.cos(frame * 0.47) + 0.6 * Math.sin(frame * 1.21 + 2.1) + 0.3 * Math.cos(frame * 2.9)) * 6 * k * u;
        rot += Math.sin(frame * 0.31) * 0.35 * k;
        break;
      case "pop": {
        const sp = spring({ frame, fps, config: { damping: 11, stiffness: 160, mass: 0.7 } });
        scale *= 1 + 0.18 * k * (1 - sp);
        break;
      }
      case "blurIn": {
        const b = interpolate(frame, [0, 22], [28 * k * u, 0], { ...clamp, easing: out });
        if (b > 0.05) contentFilters.push(`blur(${b}px)`);
        break;
      }
      case "glitch": {
        const active = frame < 9 || frame > D - 8 || frame % 47 < 2;
        if (active) {
          tx += (random(`gx${frame}`) - 0.5) * 40 * k * u;
          const o = (4 + random(`go${frame}`) * 8) * k * u;
          contentFilters.push(`drop-shadow(${o}px 0 0 rgba(255, 40, 110, 0.75))`, `drop-shadow(${-o}px 0 0 rgba(30, 220, 255, 0.75))`);
        }
        break;
      }
      default:
        break;
    }
  }

  // Cor (afeta o quadro inteiro, inclusive o fundo)
  const colorFilters: string[] = [];
  const bw = has(effects, "bw");
  const vintage = has(effects, "vintage");
  const cinema = has(effects, "cinema");
  const vivid = has(effects, "vivid");
  if (bw) colorFilters.push(`grayscale(${bw.intensity})`, `contrast(${1 + 0.1 * bw.intensity})`);
  if (vintage) colorFilters.push(`sepia(${0.6 * vintage.intensity})`, `saturate(${1 - 0.25 * vintage.intensity})`, `contrast(${1 - 0.08 * vintage.intensity})`, `brightness(${1 + 0.04 * vintage.intensity})`);
  if (cinema) colorFilters.push(`contrast(${1 + 0.2 * cinema.intensity})`, `saturate(${1 - 0.15 * cinema.intensity})`);
  if (vivid) colorFilters.push(`saturate(${1 + 0.7 * vivid.intensity})`, `contrast(${1 + 0.08 * vivid.intensity})`);

  const transform =
    scale !== 1 || tx || ty || rot ? `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rot}deg)` : undefined;

  return (
    <AbsoluteFill style={{ filter: colorFilters.length ? colorFilters.join(" ") : undefined }}>
      {background}
      <AbsoluteFill style={{ transform, filter: contentFilters.length ? contentFilters.join(" ") : undefined }}>
        {children}
      </AbsoluteFill>
      {cinema ? <CinemaTint k={cinema.intensity} /> : null}
      {vintage ? <VintageTint k={vintage.intensity} /> : null}
      {effects.map((e) => {
        switch (e.type) {
          case "vignette":
            return <Vignette key={e.id} k={e.intensity} />;
          case "grain":
            return <Grain key={e.id} k={e.intensity} />;
          case "scanlines":
            return <Scanlines key={e.id} k={e.intensity} u={u} />;
          case "leak":
            return <LightLeak key={e.id} k={e.intensity} p={p} />;
          case "letterbox":
            return <Letterbox key={e.id} k={e.intensity} />;
          case "flash":
            return <Flash key={e.id} k={e.intensity} />;
          default:
            return null;
        }
      })}
    </AbsoluteFill>
  );
};

const CinemaTint: React.FC<{ k: number }> = ({ k }) => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(160deg, rgba(255, 150, 60, 0.9) 0%, rgba(20, 120, 140, 0.9) 100%)",
      mixBlendMode: "soft-light",
      opacity: 0.32 * k,
      pointerEvents: "none",
    }}
  />
);

const VintageTint: React.FC<{ k: number }> = ({ k }) => (
  <AbsoluteFill style={{ background: "#f2c48a", mixBlendMode: "multiply", opacity: 0.18 * k, pointerEvents: "none" }} />
);

const Vignette: React.FC<{ k: number }> = ({ k }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at center, rgba(8, 9, 14, 0) 45%, rgba(8, 9, 14, ${0.85 * k}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

// Granulado: 4 texturas de ruído geradas uma única vez (gerador com semente fixa,
// então o resultado é sempre o mesmo) e alternadas a cada 2 quadros. Bem mais leve que filtro SVG.
const NOISE_SIZE = 256;
let noiseTiles: string[] | null = null;
const getNoiseTiles = () => {
  if (noiseTiles) return noiseTiles;
  if (typeof document === "undefined") return [];
  const tiles: string[] = [];
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let t = 0; t < 4; t++) {
    const c = document.createElement("canvas");
    c.width = NOISE_SIZE;
    c.height = NOISE_SIZE;
    const ctx = c.getContext("2d");
    if (!ctx) return [];
    const img = ctx.createImageData(NOISE_SIZE, NOISE_SIZE);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.round(rnd() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    tiles.push(c.toDataURL("image/png"));
  }
  noiseTiles = tiles;
  return tiles;
};

const Grain: React.FC<{ k: number }> = ({ k }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tiles = getNoiseTiles();
  if (!tiles.length) return null;
  const step = Math.floor(frame / 2);
  const size = Math.round((Math.min(width, height) / 1080) * NOISE_SIZE * 1.5);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${tiles[step % tiles.length]})`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${(step * 37) % size}px ${(step * 53) % size}px`,
        imageRendering: "auto",
        opacity: 0.16 * k,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

const Scanlines: React.FC<{ k: number; u: number }> = ({ k, u }) => {
  const frame = useCurrentFrame();
  const flicker = 0.9 + 0.1 * Math.sin(frame * 2.1);
  const line = Math.max(2, Math.round(3 * u));
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `repeating-linear-gradient(0deg, rgba(10, 12, 20, ${0.45 * k}) 0px, rgba(10, 12, 20, ${0.45 * k}) ${line}px, transparent ${line}px, transparent ${line * 2}px)`,
        opacity: flicker,
        pointerEvents: "none",
      }}
    />
  );
};

const LightLeak: React.FC<{ k: number; p: number }> = ({ k, p }) => {
  const frame = useCurrentFrame();
  const x1 = 10 + 70 * p + 6 * Math.sin(frame * 0.05);
  const y1 = 20 + 12 * Math.sin(frame * 0.04);
  const x2 = 90 - 60 * p;
  const y2 = 80 + 10 * Math.cos(frame * 0.035);
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.09);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(40% 55% at ${x1}% ${y1}%, rgba(255, 170, 70, 0.95), rgba(255, 170, 70, 0) 70%), radial-gradient(35% 45% at ${x2}% ${y2}%, rgba(255, 80, 110, 0.85), rgba(255, 80, 110, 0) 70%)`,
        mixBlendMode: "screen",
        opacity: 0.6 * k * pulse,
        pointerEvents: "none",
      }}
    />
  );
};

const Letterbox: React.FC<{ k: number }> = ({ k }) => {
  const frame = useCurrentFrame();
  const h = interpolate(frame, [0, 16], [0, 12 * k], { ...clamp, easing: out });
  const bar: React.CSSProperties = { position: "absolute", left: 0, right: 0, height: `${h}%`, background: "#0a0b10" };
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ ...bar, top: 0 }} />
      <div style={{ ...bar, bottom: 0 }} />
    </AbsoluteFill>
  );
};

const Flash: React.FC<{ k: number }> = ({ k }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 2, 12], [k, k, 0], { ...clamp, easing: out });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: "#fffaf0", opacity: o, pointerEvents: "none" }} />;
};
