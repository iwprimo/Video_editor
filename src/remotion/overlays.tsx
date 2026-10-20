import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import iconNodes from "lucide-static/icon-nodes.json";
import type { ImageAsset, Overlay, OverlayPosition, Project, Theme, StickerType } from "./types";
import { DEFAULT_CAPTIONS, FPS, outputWords, overlayWindow } from "./types";
import { CaptionPage } from "./captions";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.bezier(0.22, 1, 0.36, 1);
const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";

type IconNode = [string, Record<string, string>][];
const ICONS = iconNodes as unknown as Record<string, IconNode>;
export const ICON_NAMES = Object.keys(ICONS);

export const IconSvg: React.FC<{ name: string; size: number | string; color?: string; strokeWidth?: number }> = ({
  name,
  size,
  color = "currentColor",
  strokeWidth = 2,
}) => {
  const node = ICONS[name] ?? ICONS["sparkles"] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {node.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
};

// Converte "#rrggbb" em rgba com transparência
const alpha = (hex: string, a: number) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const isLight = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 150;
};

const ALIGN: Record<OverlayPosition, { alignItems: string; justifyContent: string }> = {
  full: { alignItems: "stretch", justifyContent: "stretch" },
  center: { alignItems: "center", justifyContent: "center" },
  top: { alignItems: "center", justifyContent: "flex-start" },
  bottom: { alignItems: "center", justifyContent: "flex-end" },
  left: { alignItems: "flex-start", justifyContent: "center" },
  right: { alignItems: "flex-end", justifyContent: "center" },
  "top-left": { alignItems: "flex-start", justifyContent: "flex-start" },
  "top-right": { alignItems: "flex-end", justifyContent: "flex-start" },
  "bottom-left": { alignItems: "flex-start", justifyContent: "flex-end" },
  "bottom-right": { alignItems: "flex-end", justifyContent: "flex-end" },
};

const str = (v: unknown, d = "") => (typeof v === "string" ? v : v == null ? d : String(v));
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : Number.isFinite(Number(v)) ? Number(v) : d);
const fmt = (n: number, decimals: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

type ViewProps = { ov: Overlay; theme: Theme; w: number; frames: number; asset?: ImageAsset; mediaBase: string };

// Painel padrão: fundo do tema semitransparente para ler bem sobre o vídeo
const panel = (theme: Theme, w: number): React.CSSProperties => ({
  background: alpha(theme.bg, 0.86),
  color: theme.ink,
  borderRadius: w * 0.04,
  padding: `${w * 0.06}px ${w * 0.07}px`,
  boxShadow: `0 ${w * 0.02}px ${w * 0.08}px ${alpha("#05060a", 0.45)}`,
  border: `1px solid ${alpha(theme.ink, 0.08)}`,
});

const ImageView: React.FC<ViewProps> = ({ ov, w, asset, mediaBase, frames }) => {
  const frame = useCurrentFrame();
  if (!asset) return null;
  const full = ov.position === "full";
  const anim = str(ov.props.animation, "pop");
  const zoom = anim === "zoom" ? interpolate(frame, [0, frames], [1, 1.12]) : 1;
  const src = `${mediaBase}/media/${asset.file}`;
  if (full) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      </AbsoluteFill>
    );
  }
  const ratio = asset.height / Math.max(1, asset.width);
  return (
    <div
      style={{
        width: w,
        height: w * ratio,
        borderRadius: ov.props.rounded === false ? 0 : w * 0.035,
        overflow: "hidden",
        boxShadow: `0 ${w * 0.03}px ${w * 0.1}px rgba(5, 6, 10, 0.45)`,
      }}
    >
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
    </div>
  );
};

const BrollView: React.FC<ViewProps> = ({ ov, w, asset, mediaBase }) => {
  if (!asset) return null;
  const full = ov.position === "full";
  const src = `${mediaBase}/media/${asset.file}`;
  const volume = typeof ov.props.volume === "number" ? ov.props.volume : 0;
  const fit = (ov.props.fit as "cover" | "contain") ?? "cover";
  const rounded = ov.props.rounded !== false;

  if (full) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <OffthreadVideo
          src={src}
          volume={volume}
          style={{ width: "100%", height: "100%", objectFit: fit }}
          pauseWhenBuffering
        />
      </AbsoluteFill>
    );
  }
  const ratio = asset.height && asset.width ? asset.height / asset.width : 9 / 16;
  return (
    <div
      style={{
        width: w,
        height: w * ratio,
        borderRadius: rounded ? w * 0.035 : 0,
        overflow: "hidden",
        boxShadow: `0 ${w * 0.03}px ${w * 0.1}px rgba(5, 6, 10, 0.45)`,
      }}
    >
      <OffthreadVideo
        src={src}
        volume={volume}
        style={{ width: "100%", height: "100%", objectFit: fit }}
        pauseWhenBuffering
      />
    </div>
  );
};

const IconView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = str(ov.props.color) || theme.accent;
  const label = str(ov.props.label);
  const sp = spring({ frame: frame - 3, fps, config: { damping: 10, stiffness: 140 } });
  const d = w * (label ? 0.62 : 0.8);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: w * 0.06, width: w }}>
      <div
        style={{
          width: d,
          height: d,
          borderRadius: "50%",
          background: color,
          color: isLight(color) ? "#14161f" : "#f6f7fb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${sp}) rotate(${(1 - sp) * -20}deg)`,
          boxShadow: `0 ${w * 0.03}px ${w * 0.12}px ${alpha(color, 0.45)}`,
        }}
      >
        <IconSvg name={str(ov.props.name, "sparkles")} size={d * 0.52} strokeWidth={2.2} />
      </div>
      {label ? (
        <div style={{ ...panel(theme, w), padding: `${w * 0.03}px ${w * 0.06}px`, fontSize: w * 0.1, fontWeight: 600, textAlign: "center" }}>
          {label}
        </div>
      ) : null}
    </div>
  );
};

const LowerThirdView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const bar = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: out });
  const t1 = interpolate(frame, [6, 20], [0, 1], { ...clamp, easing: out });
  const t2 = interpolate(frame, [11, 25], [0, 1], { ...clamp, easing: out });
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: w * 0.035, width: w }}>
      <div style={{ width: w * 0.014, borderRadius: w, background: theme.accent, transform: `scaleY(${bar})`, transformOrigin: "bottom" }} />
      <div style={{ ...panel(theme, w), padding: `${w * 0.04}px ${w * 0.06}px`, flex: 1, overflow: "hidden" }}>
        <div style={{ fontSize: w * 0.075, fontWeight: 700, letterSpacing: "-0.02em", opacity: t1, transform: `translateX(${(1 - t1) * -w * 0.05}px)` }}>
          {str(ov.props.title)}
        </div>
        {str(ov.props.subtitle) ? (
          <div style={{ marginTop: w * 0.012, fontSize: w * 0.05, fontWeight: 500, color: theme.muted, opacity: t2, transform: `translateX(${(1 - t2) * -w * 0.05}px)` }}>
            {str(ov.props.subtitle)}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const CalloutView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const pulse = 0.6 + 0.4 * Math.sin(frame * 0.25);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: w * 0.045, ...panel(theme, w), padding: `${w * 0.04}px ${w * 0.06}px`, borderRadius: w, maxWidth: w }}>
      <span style={{ width: w * 0.04, height: w * 0.04, borderRadius: "50%", background: theme.accent, flex: "none", boxShadow: `0 0 0 ${w * 0.018 * pulse}px ${alpha(theme.accent, 0.3)}` }} />
      <span style={{ fontSize: w * 0.075, fontWeight: 600, lineHeight: 1.2 }}>{str(ov.props.text)}</span>
    </div>
  );
};

const KeywordView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const text = str(ov.props.text);
  const letters = Array.from(text);
  const size = Math.min(w * 0.22, (w * 1.6) / Math.max(4, letters.length));
  return (
    <div
      style={{
        width: w,
        textAlign: "center",
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-0.03em",
        lineHeight: 1.05,
        color: theme.ink,
        textShadow: `0 ${size * 0.04}px ${size * 0.25}px rgba(5, 6, 10, 0.55)`,
      }}
    >
      {letters.map((ch, i) => {
        const t = interpolate(frame, [i * 1.2, i * 1.2 + 12], [0, 1], { ...clamp, easing: out });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: t,
              transform: `translateY(${(1 - t) * size * 0.4}px) scale(${0.85 + 0.15 * t})`,
            }}
          >
            {ch}
          </span>
        );
      })}
      <div style={{ height: size * 0.08, width: interpolate(frame, [6, 22], [0, 0.4], { ...clamp, easing: out }) * w, background: theme.accent, borderRadius: size, margin: `${size * 0.12}px auto 0` }} />
    </div>
  );
};

const CounterView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [4, 4 + 40], [0, 1], { ...clamp, easing: out });
  const decimals = Math.max(0, Math.min(3, Math.round(num(ov.props.decimals))));
  return (
    <div style={{ ...panel(theme, w), width: w, textAlign: "center" }}>
      <div style={{ fontSize: w * 0.24, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: w * 0.12, color: theme.accent }}>{str(ov.props.prefix)}</span>
        {fmt(num(ov.props.value) * t, decimals)}
        <span style={{ fontSize: w * 0.12, color: theme.accent }}>{str(ov.props.suffix)}</span>
      </div>
      {str(ov.props.label) ? <div style={{ marginTop: w * 0.035, fontSize: w * 0.07, fontWeight: 500, color: theme.muted }}>{str(ov.props.label)}</div> : null}
    </div>
  );
};

const BarChartView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = (Array.isArray(ov.props.data) ? ov.props.data : []) as { label: unknown; value: unknown }[];
  const values = data.map((d) => num(d.value));
  const max = Math.max(1, ...values);
  const top = Math.max(...values, 0);
  const n = Math.max(1, data.length);
  const chartH = w * 0.45;
  const gap = w * 0.03;
  const barW = (w * 0.86 - gap * (n - 1)) / n;
  return (
    <div style={{ ...panel(theme, w), width: w }}>
      {str(ov.props.title) ? <div style={{ fontSize: w * 0.07, fontWeight: 700, marginBottom: w * 0.04 }}>{str(ov.props.title)}</div> : null}
      <div style={{ display: "flex", alignItems: "flex-end", gap, height: chartH + w * 0.08, borderBottom: `${Math.max(1, w * 0.004)}px solid ${theme.rule}` }}>
        {data.map((d, i) => {
          const sp = Math.min(1, spring({ frame: frame - 6 - i * 4, fps, config: { damping: 16, stiffness: 120 } }));
          const v = num(d.value);
          return (
            <div key={i} style={{ width: barW, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: Math.min(w * 0.05, barW * 0.4), fontWeight: 700, marginBottom: w * 0.012, opacity: sp, color: v === top ? theme.accent : theme.ink, whiteSpace: "nowrap" }}>
                {fmt(v * sp, Number.isInteger(v) ? 0 : 1)}
              </div>
              <div style={{ width: "100%", height: Math.max(0, (v / max) * chartH * sp), background: v === top ? theme.accent : alpha(theme.ink, 0.22), borderRadius: `${w * 0.012}px ${w * 0.012}px 0 0` }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap, marginTop: w * 0.02 }}>
        {data.map((d, i) => (
          <div key={i} style={{ width: barW, textAlign: "center", fontSize: Math.min(w * 0.045, barW * 0.35), color: theme.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {str(d.label)}
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgressView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const value = Math.max(0, Math.min(100, num(ov.props.value)));
  const t = interpolate(frame, [4, 4 + 40], [0, 1], { ...clamp, easing: out });
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ ...panel(theme, w), width: w, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: w * 0.7, height: w * 0.7 }}>
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={alpha(theme.ink, 0.12)} strokeWidth="9" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={theme.accent} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - (value / 100) * t)} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: w * 0.17, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(value * t)}%
        </div>
      </div>
      {str(ov.props.label) ? <div style={{ marginTop: w * 0.04, fontSize: w * 0.075, fontWeight: 600, color: theme.muted }}>{str(ov.props.label)}</div> : null}
    </div>
  );
};

const ChecklistView: React.FC<ViewProps> = ({ ov, theme, w, frames }) => {
  const frame = useCurrentFrame();
  const items = (Array.isArray(ov.props.items) ? ov.props.items : []).map((x) => str(x).trim()).filter(Boolean);
  const step = Math.max(8, Math.min(30, Math.floor((frames - 20) / Math.max(1, items.length))));
  return (
    <div style={{ ...panel(theme, w), width: w }}>
      {str(ov.props.title) ? <div style={{ fontSize: w * 0.075, fontWeight: 700, marginBottom: w * 0.04 }}>{str(ov.props.title)}</div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: w * 0.035 }}>
        {items.map((it, i) => {
          const s0 = 8 + i * step;
          const appear = interpolate(frame, [s0, s0 + 10], [0, 1], { ...clamp, easing: out });
          const check = interpolate(frame, [s0 + 6, s0 + 16], [0, 1], { ...clamp, easing: out });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: w * 0.04, opacity: 0.25 + 0.75 * appear, transform: `translateX(${(1 - appear) * w * 0.04}px)` }}>
              <span style={{ width: w * 0.075, height: w * 0.075, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: check > 0.5 ? theme.accent : "transparent", border: `${w * 0.006}px solid ${check > 0.5 ? theme.accent : alpha(theme.ink, 0.35)}`, color: isLight(theme.accent) ? "#14161f" : "#f6f7fb" }}>
                <svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="24" strokeDashoffset={24 * (1 - check)} />
                </svg>
              </span>
              <span style={{ fontSize: w * 0.062, fontWeight: 500 }}>{it}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CtaView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const pulse = 1 + 0.03 * Math.sin(frame * 0.2);
  const ink = isLight(theme.accent) ? "#14161f" : "#f6f7fb";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: w * 0.04,
        padding: `${w * 0.05}px ${w * 0.09}px`,
        borderRadius: w,
        background: theme.accent,
        color: ink,
        fontSize: w * 0.085,
        fontWeight: 700,
        transform: `scale(${pulse})`,
        boxShadow: `0 ${w * 0.03}px ${w * 0.1}px ${alpha(theme.accent, 0.45)}`,
      }}
    >
      {str(ov.props.text)}
      <IconSvg name="arrow-right" size={w * 0.09} strokeWidth={2.6} />
    </div>
  );
};

const StickerView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stickerType = str(ov.props.stickerType, "arrow-down") as StickerType;
  const color = str(ov.props.color) || theme.accent;
  const text = str(ov.props.text);
  const sp = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });

  // Animações procedurais contínuas para retenção máxima
  const bounceY = Math.sin((frame * 8 * Math.PI) / 180) * (w * 0.08);
  const bounceX = Math.cos((frame * 8 * Math.PI) / 180) * (w * 0.08);
  const pulseScale = 1 + Math.sin((frame * 10 * Math.PI) / 180) * 0.08;
  const rippleScale = 1 + ((frame % 30) / 30) * 0.5;
  const rippleOpacity = Math.max(0, 1 - (frame % 30) / 30);
  const bellTilt = Math.sin((frame * 12 * Math.PI) / 180) * 14;

  const glowStyle: React.CSSProperties = {
    filter: `drop-shadow(0 ${w * 0.02}px ${w * 0.06}px ${alpha(color, 0.65)})`,
  };

  switch (stickerType) {
    case "arrow-down":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${bounceY}px) scale(${sp})`, ...glowStyle }}>
          {text ? (
            <div style={{ background: color, color: isLight(color) ? "#121319" : "#fff", fontWeight: 800, fontSize: w * 0.16, padding: `${w * 0.04}px ${w * 0.1}px`, borderRadius: w * 0.05, marginBottom: w * 0.04, textTransform: "uppercase", letterSpacing: "0.05em", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
              {text}
            </div>
          ) : null}
          <div style={{ width: w * 0.6, height: w * 0.6, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: isLight(color) ? "#121319" : "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
            <IconSvg name="arrow-down" size={w * 0.38} strokeWidth={3} />
          </div>
        </div>
      );

    case "arrow-right":
      return (
        <div style={{ display: "flex", alignItems: "center", gap: w * 0.06, transform: `translateX(${bounceX}px) scale(${sp})`, ...glowStyle }}>
          {text ? (
            <div style={{ background: color, color: isLight(color) ? "#121319" : "#fff", fontWeight: 800, fontSize: w * 0.16, padding: `${w * 0.04}px ${w * 0.1}px`, borderRadius: w * 0.05, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {text}
            </div>
          ) : null}
          <div style={{ width: w * 0.6, height: w * 0.6, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: isLight(color) ? "#121319" : "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
            <IconSvg name="arrow-right" size={w * 0.38} strokeWidth={3} />
          </div>
        </div>
      );

    case "arrow-curve":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${sp * pulseScale})`, ...glowStyle }}>
          {text ? (
            <div style={{ background: color, color: isLight(color) ? "#121319" : "#fff", fontWeight: 800, fontSize: w * 0.15, padding: `${w * 0.04}px ${w * 0.1}px`, borderRadius: w * 0.05, marginBottom: w * 0.04, textTransform: "uppercase" }}>
              {text}
            </div>
          ) : null}
          <div style={{ width: w * 0.65, height: w * 0.65, display: "flex", alignItems: "center", justifyContent: "center", color }}>
            <IconSvg name="corner-right-down" size={w * 0.55} strokeWidth={3.5} />
          </div>
        </div>
      );

    case "circle-pulse":
      return (
        <div style={{ position: "relative", width: w, height: w, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${sp})` }}>
          <div style={{ position: "absolute", width: w * 0.8, height: w * 0.8, borderRadius: "50%", border: `${w * 0.03}px solid ${color}`, transform: `scale(${rippleScale})`, opacity: rippleOpacity, pointerEvents: "none" }} />
          <div style={{ width: w * 0.75, height: w * 0.75, borderRadius: "50%", border: `${w * 0.05}px solid ${color}`, background: alpha(color, 0.15), display: "flex", alignItems: "center", justifyContent: "center", ...glowStyle }}>
            {text ? (
              <span style={{ color: "#fff", fontWeight: 800, fontSize: w * 0.14, textTransform: "uppercase", textAlign: "center", textShadow: "0 2px 8px #000" }}>{text}</span>
            ) : null}
          </div>
        </div>
      );

    case "alert-warning":
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: w * 0.08, background: "#1a1608", border: `${w * 0.025}px solid ${color}`, borderRadius: w * 0.08, padding: `${w * 0.06}px ${w * 0.1}px`, transform: `scale(${sp * pulseScale})`, ...glowStyle, boxShadow: `0 ${w * 0.04}px ${w * 0.12}px rgba(0,0,0,0.6)` }}>
          <div style={{ color }}>
            <IconSvg name="alert-triangle" size={w * 0.3} strokeWidth={2.5} />
          </div>
          <span style={{ color: "#ffffff", fontWeight: 800, fontSize: w * 0.18, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            {text || "ATENÇÃO"}
          </span>
        </div>
      );

    case "subscribe":
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: w * 0.08, background: color, borderRadius: w * 0.08, padding: `${w * 0.06}px ${w * 0.12}px`, transform: `scale(${sp})`, boxShadow: `0 ${w * 0.04}px ${w * 0.14}px ${alpha(color, 0.5)}` }}>
          <div style={{ transform: `rotate(${bellTilt}deg)`, color: isLight(color) ? "#121319" : "#fff" }}>
            <IconSvg name="bell" size={w * 0.28} strokeWidth={2.5} />
          </div>
          <span style={{ color: isLight(color) ? "#121319" : "#ffffff", fontWeight: 900, fontSize: w * 0.18, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            {text || "SEGUIR"}
          </span>
        </div>
      );

    case "verified":
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: w * 0.08, background: "rgba(10, 14, 26, 0.92)", border: `${w * 0.02}px solid ${color}`, borderRadius: w * 0.08, padding: `${w * 0.05}px ${w * 0.1}px`, transform: `scale(${sp * pulseScale})`, ...glowStyle }}>
          <div style={{ width: w * 0.36, height: w * 0.36, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: isLight(color) ? "#121319" : "#fff" }}>
            <IconSvg name="check" size={w * 0.22} strokeWidth={3} />
          </div>
          <span style={{ color: "#ffffff", fontWeight: 800, fontSize: w * 0.16, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
            {text || "OFICIAL"}
          </span>
        </div>
      );

    case "fire-trend":
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: w * 0.06, background: "linear-gradient(135deg, #ef4444, #f97316)", borderRadius: w * 0.08, padding: `${w * 0.06}px ${w * 0.12}px`, transform: `scale(${sp * pulseScale})`, boxShadow: "0 8px 24px rgba(239, 68, 68, 0.5)" }}>
          <div style={{ color: "#ffffff", transform: `scale(${1 + Math.sin((frame * 14 * Math.PI)/180) * 0.1})` }}>
            <IconSvg name="flame" size={w * 0.32} strokeWidth={2.4} />
          </div>
          <span style={{ color: "#ffffff", fontWeight: 900, fontSize: w * 0.18, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            {text || "VIRAL"}
          </span>
        </div>
      );

    case "tap-gesture":
      return (
        <div style={{ position: "relative", width: w * 0.7, height: w * 0.7, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${sp})` }}>
          <div style={{ position: "absolute", width: w * 0.5, height: w * 0.5, borderRadius: "50%", border: `3px solid ${color}`, transform: `scale(${rippleScale})`, opacity: rippleOpacity }} />
          <div style={{ color, transform: `scale(${pulseScale})`, ...glowStyle }}>
            <IconSvg name="pointer" size={w * 0.44} strokeWidth={2.5} />
          </div>
        </div>
      );

    default:
      return null;
  }
};

const HookPunchView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const color = str(ov.props.color) || "#ef4444";
  const badge = str(ov.props.badge) || "ALERTA";
  const text = str(ov.props.text) || "PARE O SCROLL!";
  const pulse = 1 + Math.sin(frame * 0.25) * 0.04;

  return (
    <div
      style={{
        ...panel(theme, w),
        width: w,
        padding: `${w * 0.06}px ${w * 0.08}px`,
        textAlign: "center",
        border: `${Math.max(2, w * 0.008)}px solid ${alpha(color, 0.8)}`,
        boxShadow: `0 ${w * 0.04}px ${w * 0.15}px ${alpha(color, 0.4)}, 0 ${w * 0.02}px ${w * 0.06}px rgba(0,0,0,0.8)`,
        transform: `scale(${pulse})`,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: w * 0.02,
          background: color,
          color: isLight(color) ? "#121319" : "#ffffff",
          padding: `${w * 0.02}px ${w * 0.05}px`,
          borderRadius: 9999,
          fontSize: w * 0.055,
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: w * 0.03,
          boxShadow: `0 ${w * 0.02}px ${w * 0.06}px ${alpha(color, 0.4)}`,
        }}
      >
        <IconSvg name="flame" size={w * 0.055} strokeWidth={2.8} />
        {badge}
      </div>
      <div
        style={{
          fontSize: w * 0.1,
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          textTransform: "uppercase",
          color: "#ffffff",
          textShadow: `0 2px 10px rgba(0,0,0,0.9)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const SocialQuoteView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const author = str(ov.props.author) || "@usuario";
  const badge = str(ov.props.badge) || "Seguidor";
  const text = str(ov.props.text) || "Pergunta do seguidor...";
  const likes = str(ov.props.likes) || "14.2k";
  const verified = ov.props.verified !== false;

  return (
    <div
      style={{
        ...panel(theme, w),
        width: w,
        padding: `${w * 0.05}px ${w * 0.06}px`,
        boxShadow: `0 ${w * 0.03}px ${w * 0.12}px rgba(0, 0, 0, 0.65)`,
        border: `1px solid ${alpha(theme.ink, 0.15)}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: w * 0.035, marginBottom: w * 0.035 }}>
        <div
          style={{
            width: w * 0.12,
            height: w * 0.12,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${theme.accent}, #ec4899)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            flex: "none",
          }}
        >
          <IconSvg name="user" size={w * 0.065} strokeWidth={2.4} />
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: w * 0.015 }}>
            <span style={{ fontSize: w * 0.055, fontWeight: 700, color: theme.ink }}>{author}</span>
            {verified ? (
              <span
                style={{
                  width: w * 0.045,
                  height: w * 0.045,
                  borderRadius: "50%",
                  background: "#38bdf8",
                  color: "#080c14",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSvg name="check" size={w * 0.03} strokeWidth={3.5} />
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: w * 0.04, color: theme.muted }}>{badge}</div>
        </div>
      </div>

      <div
        style={{
          fontSize: w * 0.065,
          fontWeight: 600,
          lineHeight: 1.25,
          color: theme.ink,
          textAlign: "left",
          marginBottom: w * 0.035,
        }}
      >
        “{text}”
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: w * 0.05,
          paddingTop: w * 0.025,
          borderTop: `1px solid ${alpha(theme.ink, 0.08)}`,
          fontSize: w * 0.045,
          color: theme.muted,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: w * 0.015, color: "#ef4444" }}>
          <IconSvg name="heart" size={w * 0.045} strokeWidth={2.4} color="#ef4444" />
          {likes}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: w * 0.015 }}>
          <IconSvg name="message-circle" size={w * 0.045} strokeWidth={2.4} />
          Responder
        </span>
      </div>
    </div>
  );
};

const SoundwaveView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const frame = useCurrentFrame();
  const color = str(ov.props.color) || "#22c55e";
  const sender = str(ov.props.sender) || "Mensagem de voz";
  const time = str(ov.props.time) || "0:15";

  const numBars = 20;
  const progress = (frame % 75) / 75;

  return (
    <div
      style={{
        ...panel(theme, w),
        width: w,
        padding: `${w * 0.045}px ${w * 0.06}px`,
        boxShadow: `0 ${w * 0.03}px ${w * 0.12}px rgba(0, 0, 0, 0.6)`,
      }}
    >
      <div style={{ fontSize: w * 0.045, fontWeight: 600, color: theme.muted, marginBottom: w * 0.025, textAlign: "left" }}>
        {sender}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: w * 0.04 }}>
        <div
          style={{
            width: w * 0.13,
            height: w * 0.13,
            borderRadius: "50%",
            background: color,
            color: isLight(color) ? "#121319" : "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
            boxShadow: `0 4px 14px ${alpha(color, 0.4)}`,
          }}
        >
          <IconSvg name="play" size={w * 0.065} strokeWidth={2.8} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: w * 0.012, flex: 1, height: w * 0.12 }}>
          {Array.from({ length: numBars }).map((_, i) => {
            const ratio = i / numBars;
            const isPlayed = ratio <= progress;
            const barWave = Math.abs(Math.sin((frame * 0.2) + i * 0.45));
            const barHeight = Math.max(0.18, barWave) * (w * 0.11);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: barHeight,
                  borderRadius: 999,
                  background: isPlayed ? color : alpha(theme.ink, 0.25),
                  transition: "height 0.05s ease",
                }}
              />
            );
          })}
        </div>

        <div style={{ fontSize: w * 0.045, fontWeight: 700, color: theme.ink, flex: "none", fontVariantNumeric: "tabular-nums" }}>
          {time}
        </div>
      </div>
    </div>
  );
};

const VersusView: React.FC<ViewProps> = ({ ov, theme, w }) => {
  const title = str(ov.props.title) || "Comparativo";
  const leftBadge = str(ov.props.leftBadge) || "ERRADO";
  const leftText = str(ov.props.leftText) || "Fazer manual";
  const leftColor = str(ov.props.leftColor) || "#ef4444";
  const rightBadge = str(ov.props.rightBadge) || "CERTO";
  const rightText = str(ov.props.rightText) || "Usar automação";
  const rightColor = str(ov.props.rightColor) || "#22c55e";

  return (
    <div
      style={{
        ...panel(theme, w),
        width: w,
        padding: `${w * 0.045}px ${w * 0.055}px`,
        boxShadow: `0 ${w * 0.03}px ${w * 0.14}px rgba(0, 0, 0, 0.7)`,
      }}
    >
      {title ? (
        <div style={{ fontSize: w * 0.055, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: theme.muted, marginBottom: w * 0.03, textAlign: "center" }}>
          {title}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: w * 0.03 }}>
        <div
          style={{
            background: alpha(leftColor, 0.12),
            border: `${Math.max(1, w * 0.004)}px solid ${alpha(leftColor, 0.4)}`,
            borderRadius: w * 0.03,
            padding: `${w * 0.035}px ${w * 0.03}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: w * 0.015,
              background: leftColor,
              color: "#ffffff",
              padding: `${w * 0.012}px ${w * 0.03}px`,
              borderRadius: 9999,
              fontSize: w * 0.045,
              fontWeight: 900,
              letterSpacing: "0.05em",
              marginBottom: w * 0.025,
            }}
          >
            <IconSvg name="x" size={w * 0.04} strokeWidth={3.5} />
            {leftBadge}
          </div>
          <div style={{ fontSize: w * 0.05, fontWeight: 600, color: theme.ink, lineHeight: 1.25 }}>
            {leftText}
          </div>
        </div>

        <div
          style={{
            background: alpha(rightColor, 0.12),
            border: `${Math.max(1, w * 0.004)}px solid ${alpha(rightColor, 0.4)}`,
            borderRadius: w * 0.03,
            padding: `${w * 0.035}px ${w * 0.03}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: w * 0.015,
              background: rightColor,
              color: "#ffffff",
              padding: `${w * 0.012}px ${w * 0.03}px`,
              borderRadius: 9999,
              fontSize: w * 0.045,
              fontWeight: 900,
              letterSpacing: "0.05em",
              marginBottom: w * 0.025,
            }}
          >
            <IconSvg name="check" size={w * 0.04} strokeWidth={3.5} />
            {rightBadge}
          </div>
          <div style={{ fontSize: w * 0.05, fontWeight: 600, color: theme.ink, lineHeight: 1.25 }}>
            {rightText}
          </div>
        </div>
      </div>
    </div>
  );
};

const VIEWS: Record<Overlay["kind"], React.FC<ViewProps>> = {
  image: ImageView,
  video: BrollView,
  sticker: StickerView,
  icon: IconView,
  lowerThird: LowerThirdView,
  callout: CalloutView,
  keyword: KeywordView,
  counter: CounterView,
  barChart: BarChartView,
  progress: ProgressView,
  checklist: ChecklistView,
  cta: CtaView,
  hookPunch: HookPunchView,
  socialQuote: SocialQuoteView,
  soundwave: SoundwaveView,
  versus: VersusView,
};

// Entrada e saída padrão de qualquer ilustração com animações virais
const OverlayFrame: React.FC<{ ov: Overlay; frames: number; captionsBottom: boolean; children: React.ReactNode }> = ({
  ov,
  frames,
  captionsBottom,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const sp = spring({ frame, fps, config: { damping: 18, stiffness: 170 } });
  const exit = interpolate(frame, [frames - 8, frames], [1, 0], clamp);
  const anim = String(ov.props.animation ?? "pop");
  const pad = Math.round(Math.min(width, height) * 0.06);

  let transform = `scale(${0.92 + 0.08 * sp}) translateY(${(1 - sp) * 16}px)`;

  if (anim === "slam") {
    const slamSp = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });
    const scale = interpolate(slamSp, [0, 1], [2.2, 1], clamp);
    const shake = frame >= 3 && frame <= 7 ? (Math.sin(frame * 8) * 6) : 0;
    transform = `scale(${scale}) translateY(${shake}px)`;
  } else if (anim === "slideUp") {
    const slideSp = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
    transform = `translateY(${(1 - slideSp) * 70}px)`;
  } else if (anim === "slideLeft") {
    const slideSp = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
    transform = `translateX(${(1 - slideSp) * -80}px)`;
  } else if (anim === "slideRight") {
    const slideSp = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
    transform = `translateX(${(1 - slideSp) * 80}px)`;
  } else if (anim === "glitch") {
    const glitchJitter = frame < 8 && frame % 2 === 0 ? Math.sin(frame * 3) * 8 : 0;
    transform = `scale(${0.94 + 0.06 * sp}) translateX(${glitchJitter}px)`;
  } else if (anim === "float") {
    const floatY = Math.sin((frame * 4 * Math.PI) / 180) * 8;
    transform = `scale(${0.94 + 0.06 * sp}) translateY(${floatY}px)`;
  } else if (anim === "pulse") {
    const pulseScale = 1 + Math.sin((frame * 8 * Math.PI) / 180) * 0.04;
    transform = `scale(${sp * pulseScale})`;
  } else if (anim === "fade" || ov.position === "full") {
    transform = "none";
  } else if (anim === "slide") {
    transform = `translateX(${(1 - sp) * (ov.position.includes("left") ? -60 : 60)}px)`;
  }
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        padding: ov.position === "full" ? 0 : pad,
        // Com legenda embaixo, o que fica na base sobe para não cobrir o texto
        paddingBottom: ov.position === "full" ? 0 : captionsBottom && ov.position.startsWith("bottom") ? height * 0.22 : pad,
        ...ALIGN[ov.position],
      }}
    >
      <div style={{ opacity: Math.min(1, sp * 1.4) * exit, transform, fontFamily: FONT }}>{children}</div>
    </AbsoluteFill>
  );
};

export const OverlaysLayer: React.FC<{ project: Project; mediaBase: string }> = ({ project, mediaBase }) => {
  const { width, height } = useVideoConfig();
  const minSide = Math.min(width, height);
  const captionsBottom =
    !!project.captions?.enabled &&
    (typeof project.captions.offsetY === "number"
      ? project.captions.offsetY > 60
      : (project.captions.position ?? "bottom") === "bottom") &&
    outputWords(project).length > 0;
  return (
    <>
      {(project.overlays ?? []).map((ov) => {
        const win = overlayWindow(project, ov);
        if (!win) return null;
        const View = VIEWS[ov.kind];
        if (!View) return null;
        const w = Math.round(Math.max(0.12, Math.min(1, ov.size)) * minSide);
        const asset = (ov.kind === "image" || ov.kind === "video") ? project.assets?.find((a) => a.id === ov.props.assetId) : undefined;
        return (
          <Sequence key={ov.id} from={win.from} durationInFrames={win.duration} name={`ilustração: ${ov.kind}`} layout="none">
            <OverlayFrame ov={ov} frames={win.duration} captionsBottom={captionsBottom}>
              <View ov={ov} theme={project.theme} w={w} frames={win.duration} asset={asset} mediaBase={mediaBase} />
            </OverlayFrame>
          </Sequence>
        );
      })}
    </>
  );
};

// ---------- Legendas ----------

type Page = { words: { text: string; startMs: number; endMs: number }[]; startMs: number; endMs: number };

export const CaptionsLayer: React.FC<{ project: Project }> = ({ project }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cfg = { ...DEFAULT_CAPTIONS, ...(project.captions ?? {}) };
  const pages = useMemo<Page[]>(() => {
    const words = outputWords(project);
    const out: Page[] = [];
    let cur: Page | null = null;
    for (const w of words) {
      const gap = cur ? w.startMs - cur.endMs : 0;
      if (!cur || cur.words.length >= Math.max(1, cfg.wordsPerPage) || gap > 700) {
        cur = { words: [], startMs: w.startMs, endMs: w.endMs };
        out.push(cur);
      }
      cur.words.push(w);
      cur.endMs = w.endMs;
    }
    return out;
  }, [project, cfg.wordsPerPage]);

  if (!project.captions?.enabled || !pages.length) return null;
  const t = (frame / FPS) * 1000;
  const idx = pages.findIndex((p, i) => t >= p.startMs && t < Math.min(p.endMs + 500, pages[i + 1]?.startMs ?? Infinity));
  if (idx < 0) return null;
  const page = pages[idx];
  const u = Math.min(width, height) / 1080;
  const hasOffsetY = typeof cfg.offsetY === "number";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: `0 ${width * 0.08}px`,
        pointerEvents: "none",
        ...(hasOffsetY
          ? {}
          : cfg.position === "top"
          ? { justifyContent: "flex-start", paddingTop: height * 0.08 }
          : cfg.position === "middle"
          ? { justifyContent: "center" }
          : { justifyContent: "flex-end", paddingBottom: height * 0.1 }),
      }}
    >
      {hasOffsetY ? (
        <div
          style={{
            position: "absolute",
            top: `${cfg.offsetY}%`,
            left: `${width * 0.08}px`,
            right: `${width * 0.08}px`,
            transform: "translateY(-50%)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <CaptionPage key={idx} words={page.words} t={t} pageStart={page.startMs} cfg={cfg} u={u} />
        </div>
      ) : (
        <CaptionPage key={idx} words={page.words} t={t} pageStart={page.startMs} cfg={cfg} u={u} />
      )}
    </AbsoluteFill>
  );
};
