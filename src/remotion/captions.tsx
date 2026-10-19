// Estilos de legenda. O mesmo componente desenha a legenda no vídeo e a prévia no seletor de estilos.
import React from "react";
import { Easing, interpolate } from "remotion";
import type { CaptionSettings } from "./types";
import { CAPTION_PRESETS, VIRAL_FONTS } from "./types";

export type CapWord = { text: string; startMs: number; endMs: number };

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
const overshoot = Easing.bezier(0.34, 1.56, 0.64, 1);
const WHITE = "#f7f7fa";
const INK = "#121319";

const hexRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
// Cor complementar (gira o matiz), clara o bastante para ler sobre vídeo
const partner = (hex: string) => {
  const [r, g, b] = hexRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 150 + 360) % 360;
  const s = 0.85;
  const l = 0.62;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [R, G, B] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(R)}${to(G)}${to(B)}`;
};

// Texto escuro sobre cor clara, claro sobre cor escura
const inkOn = (hex: string) => {
  const [r, g, b] = hexRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? INK : WHITE;
};

// Contorno feito com sombras em volta (funciona igual no navegador e na exportação)
const ring = (r: number, color: string, steps = 16) => {
  const out: string[] = [];
  for (let k = 0; k < steps; k++) {
    const a = (k / steps) * Math.PI * 2;
    out.push(`${(Math.cos(a) * r).toFixed(2)}px ${(Math.sin(a) * r).toFixed(2)}px 0 ${color}`);
  }
  return out.join(", ");
};

// Dicionário de emojis contextuais para termos-chave frequentes em vídeos virais
const EMOJI_MAP: [RegExp, string][] = [
  [/\b(dinheiro|grana|money|lucro|faturamento|dolar|dólar|riqueza|rico|pagar|vendas|venda|comprar|investir|investimento|custo|preco|preço)\b/i, "💸"],
  [/\b(fogo|viral|quente|bombou|chamas|incrivel|incrível|demais)\b/i, "🔥"],
  [/\b(foguete|crescer|crescimento|escalar|decolar|lancamento|lançamento|avancar|avançar|futuro)\b/i, "🚀"],
  [/\b(meta|alvo|objetivo|foco|resultado|alcance)\b/i, "🎯"],
  [/\b(tempo|rapido|rápido|hora|segundo|urgente|cronometro|cronômetro|agora|prazo)\b/i, "⏱️"],
  [/\b(ideia|mente|pensar|segredo|estrategia|estratégia|cerebro|cérebro|aprender|sacada)\b/i, "💡"],
  [/\b(coracao|coração|amor|paixao|paixão|gostar|amar)\b/i, "❤️"],
  [/\b(perigo|cuidado|alerta|atencao|atenção|erro|aviso)\b/i, "⚠️"],
  [/\b(top|estrela|melhor|sucesso|vencedor|campeao|campeão|nota)\b/i, "⭐"],
  [/\b(video|vídeo|gravando|camera|câmera|canal|youtube|tiktok|reels)\b/i, "🎥"],
  [/\b(presente|gratis|grátis|bonus|bônus|free|oferta)\b/i, "🎁"],
  [/\b(parar|pare|bloqueio|nunca|proibido|cancelado)\b/i, "🛑"],
  [/\b(forte|forca|força|musculo|músculo|treino|poder|garra)\b/i, "💪"],
  [/\b(olha|olhar|veja|vejam|olhe|escuta)\b/i, "👀"],
  [/\b(musica|música|som|audio|áudio|ouvir)\b/i, "🎵"],
];

export const getAutoEmoji = (text: string): string => {
  const clean = text.toLowerCase().replace(/[.,!?;:"'()]/g, "").trim();
  for (const [re, emoji] of EMOJI_MAP) {
    if (re.test(clean)) return emoji;
  }
  return "";
};

type Props = {
  words: CapWord[];
  t: number; // tempo atual em ms
  pageStart: number;
  cfg: CaptionSettings;
  u: number; // escala: 1 = vídeo de 1080 px no lado menor
};

export const CaptionPage: React.FC<Props> = ({ words, t, pageStart, cfg, u }) => {
  const style = cfg.style;
  const upper = cfg.uppercase || !!CAPTION_PRESETS[style]?.uppercase;
  const big = style === "impact" || style === "duo" || style === "hormozi" || style === "mrbeast";
  const size = 58 * u * cfg.size * (big ? 1.18 : style === "pop" ? 1.3 : 1);
  const soft = `0 0 ${4 * u}px rgba(8, 9, 14, 0.95), 0 ${3 * u}px ${12 * u}px rgba(8, 9, 14, 0.7)`;
  const thick = `${ring(size * 0.075, "#0b0c12")}, 0 ${size * 0.08}px ${size * 0.12}px rgba(8, 9, 14, 0.55)`;
  const ultraThick = `${ring(size * 0.095, "#0b0c12", 20)}, 0 ${size * 0.09}px 0 #0b0c12, 0 ${size * 0.16}px ${size * 0.22}px rgba(8, 9, 14, 0.75)`;
  const thin = `${ring(size * 0.035, "rgba(8, 9, 14, 0.92)", 12)}, 0 ${2 * u}px ${6 * u}px rgba(8, 9, 14, 0.5)`;
  const pageAge = t - pageStart;
  const selfAnimated = style === "bounce" || style === "rise" || style === "typewriter" || style === "pop";
  const appear = selfAnimated ? 1 : interpolate(pageAge, [0, 140], [0, 1], { ...clamp, easing: easeOut });
  const accent = cfg.color;
  const textColor = cfg.textColor || WHITE;

  const visible = style === "pop" ? words.filter((w) => t >= w.startMs).slice(-1) : style === "bounce" ? words.filter((w) => t >= w.startMs) : words;

  const fontObj = cfg.fontFamily ? VIRAL_FONTS.find((f) => f.id === cfg.fontFamily || f.name === cfg.fontFamily) : null;
  const effectiveFont = fontObj ? fontObj.family : FONT;

  const container: React.CSSProperties = {
    fontFamily: effectiveFont,
    fontSize: size,
    fontWeight: 800,
    lineHeight: 1.2,
    textAlign: "center",
    letterSpacing: "-0.01em",
    textTransform: upper ? "uppercase" : "none",
    maxWidth: big ? "86%" : "100%",
    opacity: appear,
    transform: `translateY(${(1 - appear) * 10 * u}px)`,
  };
  if (style === "box") Object.assign(container, { background: "rgba(12, 13, 20, 0.82)", padding: `${size * 0.22}px ${size * 0.4}px`, borderRadius: size * 0.25 });
  if (style === "block") {
    const s = interpolate(pageAge, [0, 180], [0.9, 1], { ...clamp, easing: overshoot });
    Object.assign(container, {
      background: accent,
      color: inkOn(accent),
      padding: `${size * 0.14}px ${size * 0.34}px`,
      borderRadius: size * 0.18,
      boxShadow: `0 ${size * 0.12}px ${size * 0.4}px rgba(8, 9, 14, 0.35)`,
      transform: `scale(${s})`,
    });
  }
  if (big) Object.assign(container, { fontWeight: 900, lineHeight: 1.08, letterSpacing: "0" });
  if (style === "hormozi" || style === "mrbeast") {
    container.fontFamily = `Impact, "Arial Black", ${FONT}`;
    container.fontWeight = 900;
  }
  if (style === "outline" || style === "typewriter") container.fontWeight = 650;
  if (style === "neon" || style === "glow") container.fontWeight = 700;

  // Máquina de escrever: quantas letras de cada palavra já apareceram
  let cursorAt = -1;
  if (style === "typewriter") {
    words.forEach((w, i) => {
      if (t >= w.startMs) cursorAt = i;
    });
  }

  return (
    <div style={container}>
      {visible.map((w, i) => {
        const age = t - w.startMs;
        // Ativa até a próxima palavra começar: nunca duas destacadas ao mesmo tempo
        const nextW = words[words.indexOf(w) + 1];
        const active = t >= w.startMs && t < (nextW ? nextW.startMs : w.endMs + 300);
        const spoken = t >= w.startMs;
        const gap = i < visible.length - 1 ? (big ? "0.34em" : "0.26em") : 0;
        const base: React.CSSProperties = { display: "inline-block", marginRight: gap, color: textColor, textShadow: soft, whiteSpace: "pre" };
        const key = `${w.startMs}-${i}`;
        const autoEmoji = cfg.autoEmoji ? getAutoEmoji(w.text) : "";
        const emojiBadge = autoEmoji ? (
          <span style={{ marginRight: "0.15em", display: "inline-block", filter: "none", textShadow: "none" }}>{autoEmoji}</span>
        ) : null;

        switch (style) {
          case "karaoke":
            return (
              <span key={key} style={{ ...base, color: active ? accent : spoken ? textColor : "rgba(247, 247, 250, 0.82)", transform: `scale(${active ? 1.06 : 1})` }}>
                {emojiBadge}
                {w.text}
              </span>
            );
          case "pop": {
            const s = interpolate(age, [0, 120], [0.7, 1], { ...clamp, easing: overshoot });
            return (
              <span key={key} style={{ ...base, color: accent, transform: `scale(${s})` }}>
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "box":
            return (
              <span key={key} style={{ ...base, textShadow: "none", color: active ? accent : textColor }}>
                {emojiBadge}
                {w.text}
              </span>
            );
          case "minimal":
            return (
              <span key={key} style={base}>
                {emojiBadge}
                {w.text}
              </span>
            );
          case "outline":
            return (
              <span key={key} style={{ ...base, textShadow: thin }}>
                {emojiBadge}
                {w.text}
              </span>
            );
          case "highlight": {
            const s = active ? interpolate(age, [0, 140], [0.88, 1], { ...clamp, easing: overshoot }) : 1;
            return (
              <span
                key={key}
                style={{
                  ...base,
                  marginRight: i < visible.length - 1 ? "0.08em" : 0,
                  padding: "0.02em 0.2em 0.06em",
                  borderRadius: "0.2em",
                  background: active ? accent : "transparent",
                  color: active ? inkOn(accent) : textColor,
                  textShadow: active ? "none" : soft,
                  boxShadow: active ? `0 ${size * 0.06}px ${size * 0.2}px rgba(8, 9, 14, 0.35)` : "none",
                  transform: `scale(${s}) rotate(${active ? -1.5 : 0}deg)`,
                }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "impact": {
            const s = active ? interpolate(age, [0, 160], [1.28, 1.12], { ...clamp, easing: easeOut }) : 1;
            return (
              <span key={key} style={{ ...base, color: active ? accent : textColor, textShadow: thick, transform: `scale(${s})` }}>
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "duo": {
            const s = active ? interpolate(age, [0, 160], [1.25, 1.12], { ...clamp, easing: easeOut }) : 1;
            const idx = words.indexOf(w);
            return (
              <span
                key={key}
                style={{ ...base, color: active ? textColor : idx % 2 ? partner(accent) : accent, textShadow: thick, transform: `scale(${s}) rotate(${active ? -3 : 0}deg)` }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "bounce": {
            const p = interpolate(age, [0, 220], [0, 1], { ...clamp, easing: overshoot });
            return (
              <span
                key={key}
                style={{
                  ...base,
                  color: active ? accent : textColor,
                  textShadow: thin,
                  opacity: Math.min(1, age / 60),
                  transform: `translateY(${(1 - p) * 0.55}em) scale(${0.6 + 0.4 * p})`,
                }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "rise": {
            const p = interpolate(age, [0, 200], [0, 1], { ...clamp, easing: easeOut });
            return (
              <span
                key={key}
                style={{
                  ...base,
                  color: active ? accent : textColor,
                  opacity: spoken ? p : 0,
                  filter: `blur(${(1 - p) * 6 * u}px)`,
                  transform: `translateY(${(1 - p) * 0.4}em)`,
                }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "neon": {
            const glow = active ? 1 : spoken ? 0.55 : 0.32;
            return (
              <span
                key={key}
                style={{
                  ...base,
                  color: active ? "#ffffff" : rgba(accent, 0.55 + glow * 0.4),
                  textShadow: [
                    `0 0 ${0.04 * size}px rgba(255, 255, 255, ${0.6 * glow})`,
                    `0 0 ${0.18 * size}px ${rgba(accent, 0.9 * glow)}`,
                    `0 0 ${0.42 * size}px ${rgba(accent, 0.75 * glow)}`,
                    `0 0 ${0.9 * size}px ${rgba(accent, 0.5 * glow)}`,
                    `0 ${2 * u}px ${6 * u}px rgba(8, 9, 14, 0.6)`,
                  ].join(", "),
                }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "block":
            return (
              <span
                key={key}
                style={{
                  ...base,
                  marginRight: i < visible.length - 1 ? "0.1em" : 0,
                  padding: "0 0.16em",
                  borderRadius: "0.14em",
                  textShadow: "none",
                  color: active ? accent : inkOn(accent),
                  background: active ? inkOn(accent) : "transparent",
                }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          case "typewriter": {
            const dur = Math.max(120, Math.min(600, w.endMs - w.startMs));
            const n = spoken ? Math.ceil(w.text.length * Math.min(1, age / dur)) : 0;
            const blink = Math.floor(t / 420) % 2 === 0;
            const showCursor = i === cursorAt;
            return (
              <span key={key} style={{ ...base, textShadow: soft }}>
                {w.text.slice(0, n)}
                {showCursor ? (
                  // Largura líquida zero: o cursor não empurra as letras
                  <span
                    style={{
                      display: "inline-block",
                      width: "0.08em",
                      height: "0.9em",
                      margin: "0 -0.04em",
                      verticalAlign: "-0.08em",
                      background: accent,
                      opacity: blink ? 1 : 0,
                    }}
                  />
                ) : null}
                <span style={{ color: "transparent", textShadow: "none" }}>{w.text.slice(n)}</span>
              </span>
            );
          }
          case "hormozi": {
            const boost = cfg.activeScale ?? 1.15;
            const s = active ? interpolate(age, [0, 160], [1.25 * boost, boost], { ...clamp, easing: easeOut }) : 1;
            const rot = active ? -2.5 : 0;
            return (
              <span
                key={key}
                style={{
                  ...base,
                  position: "relative",
                  zIndex: active ? 2 : 1,
                  color: active ? accent : textColor,
                  textShadow: ultraThick,
                  transform: `scale(${s}) rotate(${rot}deg)`,
                }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "mrbeast": {
            const boost = cfg.activeScale ?? 1.2;
            const s = active ? interpolate(age, [0, 150], [1.28 * boost, boost], { ...clamp, easing: overshoot }) : 1;
            const rot = active ? (words.indexOf(w) % 2 === 0 ? 2 : -2) : 0;
            return (
              <span
                key={key}
                style={{
                  ...base,
                  position: "relative",
                  zIndex: active ? 2 : 1,
                  color: active ? accent : textColor,
                  textShadow: ultraThick,
                  transform: `scale(${s}) rotate(${rot}deg)`,
                }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          case "glow": {
            const boost = cfg.activeScale ?? 1.08;
            const s = active ? interpolate(age, [0, 180], [1.18 * boost, boost], { ...clamp, easing: overshoot }) : 1;
            const glow = active
              ? [
                  `0 0 ${size * 0.1}px #ffffff`,
                  `0 0 ${size * 0.25}px ${accent}`,
                  `0 0 ${size * 0.55}px ${accent}`,
                  `0 0 ${size * 0.95}px ${rgba(accent, 0.75)}`,
                  `0 ${2 * u}px ${8 * u}px rgba(8, 9, 14, 0.9)`,
                ].join(", ")
              : soft;
            return (
              <span
                key={key}
                style={{
                  ...base,
                  position: "relative",
                  zIndex: active ? 2 : 1,
                  color: active ? "#ffffff" : textColor,
                  textShadow: glow,
                  transform: `scale(${s})`,
                }}
              >
                {emojiBadge}
                {w.text}
              </span>
            );
          }
          default:
            return (
              <span key={key} style={base}>
                {emojiBadge}
                {w.text}
              </span>
            );
        }
      })}
    </div>
  );
};
