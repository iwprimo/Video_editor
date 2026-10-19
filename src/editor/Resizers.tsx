// Larguras ajustáveis das barras laterais e altura da linha do tempo.
// Arraste a borda para mudar, duplo clique volta ao padrão, setas do teclado ajustam de 16 em 16 px.
import React, { useCallback, useEffect, useRef, useState } from "react";

export type Layout = { left: number; right: number; timeline: number };

const KEY = "editor-video:layout";
const CENTER_MIN = 380; // largura mínima da área do vídeo
const TOP_BAR = 56;
const STAGE_MIN = 220; // altura mínima da área do vídeo

const defaults = (): Layout => {
  const narrow = typeof window !== "undefined" && window.innerWidth <= 1240;
  return { left: narrow ? 240 : 284, right: narrow ? 300 : 340, timeline: 286 };
};

const LIMITS = {
  left: [200, 560],
  right: [260, 680],
  timeline: [170, 640],
} as const;

// Limites que dependem do tamanho da janela, para o centro nunca sumir.
// "changed" é a barra que está sendo arrastada: ela para no limite e não empurra a outra.
const clampLayout = (l: Layout, changed?: keyof Layout): Layout => {
  const w = typeof window !== "undefined" ? window.innerWidth : 1600;
  const h = typeof window !== "undefined" ? window.innerHeight : 900;
  const c = (v: number, a: number, b: number) => Math.round(Math.max(a, Math.min(Math.max(a, b), v)));
  const room = w - CENTER_MIN;
  let left = c(l.left, LIMITS.left[0], LIMITS.left[1]);
  let right = c(l.right, LIMITS.right[0], LIMITS.right[1]);
  if (changed === "left") left = c(left, LIMITS.left[0], room - right);
  else if (changed === "right") right = c(right, LIMITS.right[0], room - left);
  else if (left + right > room) {
    // Janela ficou menor: reduz primeiro a barra da direita, depois a da esquerda
    right = c(right, LIMITS.right[0], room - left);
    left = c(left, LIMITS.left[0], room - right);
  }
  const tlMax = Math.min(LIMITS.timeline[1], h - TOP_BAR - STAGE_MIN);
  const timeline = c(l.timeline, LIMITS.timeline[0], tlMax);
  return { left, right, timeline };
};

const load = (): Layout => {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return clampLayout({
        left: Number(v.left) || d.left,
        right: Number(v.right) || d.right,
        timeline: Number(v.timeline) || d.timeline,
      });
    }
  } catch {
    /* armazenamento indisponível */
  }
  return clampLayout(d);
};

export const useLayout = () => {
  const [layout, setLayoutRaw] = useState<Layout>(load);
  const setLayout = useCallback((patch: Partial<Layout>) => {
    const changed = Object.keys(patch)[0] as keyof Layout | undefined;
    setLayoutRaw((prev) => clampLayout({ ...prev, ...patch }, changed));
  }, []);
  const reset = useCallback((k: keyof Layout) => setLayout({ [k]: defaults()[k] }), [setLayout]);

  // Salva depois de parar de arrastar
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(layout));
      } catch {
        /* armazenamento indisponível */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [layout]);

  // Janela menor: reacomoda para o vídeo continuar visível
  useEffect(() => {
    const onResize = () => setLayoutRaw((prev) => clampLayout(prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return { layout, setLayout, reset };
};

type HandleProps = {
  kind: keyof Layout;
  value: number;
  label: string;
  style: React.CSSProperties;
  onChange: (v: number) => void;
  onReset: () => void;
};

// sinal: quanto o valor muda para cada pixel arrastado para a direita/baixo
const SIGN: Record<keyof Layout, number> = { left: 1, right: -1, timeline: -1 };

export const ResizeHandle: React.FC<HandleProps> = ({ kind, value, label, style, onChange, onReset }) => {
  const start = useRef<{ pos: number; value: number } | null>(null);
  const raf = useRef(0);
  const [active, setActive] = useState(false);
  const vertical = kind !== "timeline"; // a barra é vertical para as laterais

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { pos: vertical ? e.clientX : e.clientY, value };
    setActive(true);
    document.body.classList.add(vertical ? "resizing-x" : "resizing-y");
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const delta = ((vertical ? e.clientX : e.clientY) - s.pos) * SIGN[kind];
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => onChange(s.value + delta));
  };
  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    start.current = null;
    setActive(false);
    document.body.classList.remove("resizing-x", "resizing-y");
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* já liberado */
    }
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16;
    const keys = vertical ? { dec: "ArrowLeft", inc: "ArrowRight" } : { dec: "ArrowUp", inc: "ArrowDown" };
    if (e.key === keys.inc) onChange(value + step * SIGN[kind]);
    else if (e.key === keys.dec) onChange(value - step * SIGN[kind]);
    else if (e.key === "Home" || e.key === "Enter") onReset();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={`resize-handle ${vertical ? "x" : "y"}${active ? " active" : ""}`}
      style={style}
      role="separator"
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-label={label}
      aria-valuenow={value}
      tabIndex={0}
      title={`${label} — arraste para ajustar, duplo clique volta ao padrão`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
    />
  );
};
