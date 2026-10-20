import React, { useEffect, useMemo, useRef, useState } from "react";
import { FX_MIME, FxPayload } from "./EffectsLibrary";
import { OVERLAY_MIME, OverlayPayload } from "./IllustrationsLibrary";
import { WaveformBlock } from "./WaveformBlock";
import {
  FPS,
  OVERLAYS,
  locateFrame,
  outputWords,
  overlayWindow,
  TRANSITIONS,
  sceneStarts,
  transitionFrames,
  MAX_SCENE_FRAMES,
  MIN_SCENE_FRAMES,
  Project,
  SCENE_LABELS,
  Scene,
  SceneType,
  VideoScene,
  withVideoDuration,
  totalFrames,
} from "../remotion/types";

type Props = {
  project: Project;
  frame: number;
  playing: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSeek: (frame: number) => void;
  onTogglePlay: () => void;
  onPreview: (p: Project) => void;
  onCommitFrom: (base: Project) => void;
  onAdd: (type: SceneType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onDropFx: (sceneId: string, fx: FxPayload) => void;
  selectedOverlayId: string | null;
  onSelectOverlay: (id: string) => void;
  onDropOverlay: (frame: number, payload: OverlayPayload) => void;
  onImportVideo: () => void;
  onSplit?: () => void;
  canSplit?: boolean;
};

const SNAP = 15; // meio segundo
const PAD = 16;

export const formatTime = (frames: number) => {
  const s = frames / FPS;
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, "0")}`;
};

const sceneSummary = (s: Scene) => {
  switch (s.type) {
    case "title":
      return s.title;
    case "chart":
      return s.title;
    case "stats":
      return s.title || `${s.stats.length} números`;
    case "text":
      return s.text;
    case "outro":
      return s.brand;
    case "video":
      return s.name;
  }
};

const LANE_H = 24;
const MAX_LANES = 6;

type DragState = { id: string; dx: number; target: number } | null;

export const Timeline: React.FC<Props> = (p) => {
  const { project } = p;
  const total = totalFrames(project);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(800);
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<DragState>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Ignora variações de menos de 2px (barra de rolagem aparecendo/sumindo) para não entrar em ciclo
    const measure = () => {
      const w = Math.round(el.clientWidth);
      setWrapW((prev) => (Math.abs(prev - w) < 2 ? prev : w));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const ppf = Math.max(0.5, ((Math.max(200, wrapW) - PAD * 2) / Math.max(1, total)) * zoom);
  const contentW = total * ppf + PAD * 2;

  const starts = useMemo(() => sceneStarts(project.scenes), [project.scenes]);
  const trans = useMemo(() => project.scenes.map((_, i) => transitionFrames(project.scenes, i)), [project.scenes]);
  const [dropId, setDropId] = useState<string | null>(null);

  // Réguas: marca a cada segundo, rótulo com espaçamento mínimo de ~70px
  const ticks = useMemo(() => {
    const secs = Math.ceil(total / FPS);
    const pxPerSec = ppf * FPS;
    const labelEvery = [1, 2, 5, 10, 15, 30, 60].find((n) => n * pxPerSec >= 70) ?? 60;
    const out: { x: number; label?: string }[] = [];
    for (let s = 0; s <= secs; s++) {
      out.push({ x: PAD + s * pxPerSec, label: s % labelEvery === 0 ? `${s}s` : undefined });
    }
    return out;
  }, [total, ppf]);

  const frameFromClientX = (clientX: number) => {
    const el = wrapRef.current!;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft - PAD;
    return Math.max(0, Math.min(total - 1, Math.round(x / ppf)));
  };

  const startScrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    p.onSeek(frameFromClientX(e.clientX));
    const move = (ev: PointerEvent) => p.onSeek(frameFromClientX(ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startBlockDrag = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const scene = project.scenes[index];
    const startX = e.clientX;
    const base = project;
    const others = base.scenes.filter((_, i) => i !== index);
    let dragging = false;
    let target = index;

    const computeTarget = (clientX: number) => {
      const el = wrapRef.current!;
      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left + el.scrollLeft - PAD) / ppf;
      let acc = 0;
      let t = 0;
      for (const o of others) {
        if (acc + o.duration / 2 < x) t++;
        acc += o.duration;
      }
      return t;
    };

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (!dragging && Math.abs(dx) > 4) dragging = true;
      if (dragging) {
        target = computeTarget(ev.clientX);
        setDrag({ id: scene.id, dx, target });
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      if (!dragging) {
        p.onSelect(scene.id);
        p.onSeek(starts[index] + Math.min(60, Math.round(scene.duration * 0.6)));
        return;
      }
      if (target !== index) {
        const next = [...others];
        next.splice(target, 0, scene);
        p.onPreview({ ...base, scenes: next });
        p.onCommitFrom(base);
      }
      p.onSelect(scene.id);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startTrim = (e: React.PointerEvent, index: number, edge: "left" | "right") => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const base = project;
    const target = base.scenes[index];
    if (!target) return;
    const startX = e.clientX;
    const startDur = target.duration;
    p.onSelect(target.id);

    const isVideo = target.type === "video" && Array.isArray(target.segments) && target.segments.length > 0;
    const videoSegs = isVideo ? (target as VideoScene).segments : [];
    const initialStart = videoSegs[0]?.start ?? 0;
    const initialEnd = videoSegs[videoSegs.length - 1]?.end ?? ((target as VideoScene).srcDuration || startDur / FPS);

    const move = (ev: PointerEvent) => {
      const rawFrames = (ev.clientX - startX) / ppf;
      const snap = ev.altKey ? 1 : SNAP;
      const deltaFrames = Math.round(rawFrames / snap) * snap;
      const deltaSec = deltaFrames / FPS;

      let nextScene: Scene;

      if (isVideo) {
        const vTarget = target as VideoScene;
        if (edge === "left") {
          // Trimming início: arrastar para a esquerda (delta negativo) recupera vídeo/fala anterior do arquivo original
          // arrastar para a direita (delta positivo) apara o início
          const maxStart = videoSegs[0].end - 0.1;
          const newStart = Math.max(0, Math.min(maxStart, Math.round((initialStart + deltaSec) * 1000) / 1000));
          const nextSegs = videoSegs.map((s, idx) => (idx === 0 ? { ...s, start: newStart } : s));
          nextScene = withVideoDuration({ ...vTarget, segments: nextSegs });
        } else {
          // Trimming final: arrastar para a direita (delta positivo) expande o final recuperando material
          // arrastar para a esquerda (delta negativo) apara o final
          const lastIdx = videoSegs.length - 1;
          const minEnd = videoSegs[lastIdx].start + 0.1;
          const maxEnd = vTarget.srcDuration > 0 ? vTarget.srcDuration : 86400;
          const newEnd = Math.max(minEnd, Math.min(maxEnd, Math.round((initialEnd + deltaSec) * 1000) / 1000));
          const nextSegs = videoSegs.map((s, idx) => (idx === lastIdx ? { ...s, end: newEnd } : s));
          nextScene = withVideoDuration({ ...vTarget, segments: nextSegs });
        }
      } else {
        if (edge === "right") {
          const dur = Math.max(MIN_SCENE_FRAMES, Math.min(MAX_SCENE_FRAMES, Math.round((startDur + deltaFrames) / snap) * snap));
          nextScene = { ...target, duration: dur };
        } else {
          const dur = Math.max(MIN_SCENE_FRAMES, Math.min(MAX_SCENE_FRAMES, Math.round((startDur - deltaFrames) / snap) * snap));
          nextScene = { ...target, duration: dur };
        }
      }

      if (nextScene.duration === base.scenes[index].duration && ev.type !== "pointermove") return;
      const scenes = base.scenes.map((s, i) => (i === index ? nextScene : s));
      p.onPreview({ ...base, scenes });
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      p.onCommitFrom(base);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ---------- Ilustrações ----------
  const overlayItems = useMemo(() => {
    const items = (project.overlays ?? [])
      .map((ov) => ({ ov, win: overlayWindow(project, ov) }))
      .filter((x): x is { ov: typeof x.ov; win: { from: number; duration: number } } => !!x.win)
      .sort((a, b) => a.win.from - b.win.from);
    const laneEnds: number[] = [];
    return items.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.win.from);
      if (lane < 0) lane = laneEnds.length < MAX_LANES ? laneEnds.length : MAX_LANES - 1;
      laneEnds[lane] = Math.max(laneEnds[lane] ?? 0, it.win.from + it.win.duration);
      return { ...it, lane };
    });
  }, [project]);

  const laneCount = overlayItems.reduce((m, it) => Math.max(m, it.lane + 1), 0);

  const captionChips = useMemo(() => {
    if (!project.captions?.enabled) return [];
    const words = outputWords(project);
    const per = Math.max(1, project.captions.wordsPerPage ?? 5);
    const out: { from: number; to: number; text: string }[] = [];
    for (let i = 0; i < words.length; i += per) {
      const chunk = words.slice(i, i + per);
      out.push({ from: (chunk[0].startMs / 1000) * FPS, to: (chunk[chunk.length - 1].endMs / 1000) * FPS, text: chunk.map((w) => w.text).join(" ") });
    }
    return out;
  }, [project]);

  const startOverlayDrag = (e: React.PointerEvent, id: string, mode: "move" | "resize") => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const base = project;
    const ov = base.overlays?.find((o) => o.id === id);
    const win = ov && overlayWindow(base, ov);
    if (!ov || !win) return;
    p.onSelectOverlay(id);
    const startX = e.clientX;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dxFrames = (ev.clientX - startX) / ppf;
      if (!moved && Math.abs(ev.clientX - startX) > 3) moved = true;
      if (!moved) return;
      let next = ov;
      if (mode === "move") {
        const from = Math.max(0, Math.min(total - 1, Math.round(win.from + dxFrames)));
        const loc = locateFrame(base, from);
        if (!loc) return;
        next = { ...ov, sceneId: loc.scene.id, at: Math.round(loc.at * 100) / 100 };
      } else {
        const frames = Math.max(15, Math.round(win.duration + dxFrames));
        next = { ...ov, duration: Math.round((frames / FPS) * 10) / 10 };
      }
      p.onPreview({ ...base, overlays: (base.overlays ?? []).map((o) => (o.id === id ? next : o)) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (moved) p.onCommitFrom(base);
      else p.onSeek(win.from + 2);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const [overlayDropX, setOverlayDropX] = useState<number | null>(null);

  // Indicador de onde a cena arrastada vai cair
  const dropX = useMemo(() => {
    if (!drag) return null;
    const idx = project.scenes.findIndex((s) => s.id === drag.id);
    const others = project.scenes.filter((_, i) => i !== idx);
    const frames = others.slice(0, drag.target).reduce((a, s) => a + s.duration, 0);
    return PAD + frames * ppf;
  }, [drag, project.scenes, ppf]);

  const selectedIndex = project.scenes.findIndex((s) => s.id === p.selectedId);

  return (
    <section className="timeline" aria-label="Linha do tempo">
      <div className="tl-toolbar">
        <button className="btn icon" onClick={p.onTogglePlay} title="Reproduzir / pausar (espaço)" aria-label="Reproduzir ou pausar">
          {p.playing ? (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><rect x="3" y="2" width="3.5" height="12" rx="1" /><rect x="9.5" y="2" width="3.5" height="12" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden><path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" /></svg>
          )}
        </button>
        <span className="time" aria-live="off">
          {formatTime(p.frame)} <span className="muted">/ {formatTime(total)}</span>
        </span>

        <span className="sep" />

        <div className="add-wrap">
          <button className="btn" onClick={() => setAddOpen((v) => !v)} aria-expanded={addOpen}>
            + Cena
          </button>
          {addOpen ? (
            <div className="menu" role="menu" onMouseLeave={() => setAddOpen(false)}>
              <button
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  p.onImportVideo();
                  setAddOpen(false);
                }}
              >
                <span className="swatch t-video" />
                Vídeo gravado…
              </button>
              <span className="menu-sep" />
              {(Object.keys(SCENE_LABELS) as SceneType[]).filter((t) => t !== "video").map((t) => (
                <button
                  key={t}
                  role="menuitem"
                  className="menu-item"
                  onClick={() => {
                    p.onAdd(t);
                    setAddOpen(false);
                  }}
                >
                  <span className={`swatch t-${t}`} />
                  {SCENE_LABELS[t]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button className="btn ghost" onClick={p.onDuplicate} disabled={selectedIndex < 0} title="Duplicar (Ctrl+D)">
          Duplicar
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={p.onSplit}
          disabled={!p.canSplit}
          title="Cortar cena no ponto do cursor (Atalho: S ou C)"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ verticalAlign: "middle", marginRight: 4 }}>
            <circle cx="6" cy="6" r="3" />
            <circle cx="6" cy="18" r="3" />
            <line x1="20" y1="4" x2="8.12" y2="15.88" />
            <line x1="14.47" y1="14.48" x2="20" y2="20" />
            <line x1="8.12" y1="8.12" x2="12" y2="12" />
          </svg>
          Cortar
        </button>
        <button className="btn ghost danger" onClick={p.onDelete} disabled={selectedIndex < 0 || project.scenes.length <= 1} title="Excluir (Delete)">
          Excluir
        </button>

        <span className="sep" />

        <button className="btn ghost" onClick={p.onUndo} disabled={!p.canUndo} title="Desfazer (Ctrl+Z)">
          Desfazer
        </button>
        <button className="btn ghost" onClick={p.onRedo} disabled={!p.canRedo} title="Refazer (Ctrl+Shift+Z)">
          Refazer
        </button>

        <span className="grow" />
        <label className="zoom">
          <span className="muted">Zoom</span>
          <input type="range" min={1} max={6} step={0.25} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
      </div>

      <div className="tl-scroll" ref={wrapRef}>
        <div className="tl-content" style={{ width: contentW }}>
          <div className="ruler" onPointerDown={startScrub}>
            {ticks.map((t, i) => (
              <span key={i} className={t.label ? "tick major" : "tick"} style={{ left: t.x }}>
                {t.label ? <em>{t.label}</em> : null}
              </span>
            ))}
          </div>

          <div className="track" onPointerDown={(e) => e.target === e.currentTarget && startScrub(e)}>
            {project.scenes.map((s, i) => {
              const isDrag = drag?.id === s.id;
              const visible = s.duration - trans[i];
              const fxCount = (s.effects ?? []).length;
              return (
                <div
                  key={s.id}
                  className={`block t-${s.type}${s.id === p.selectedId ? " selected" : ""}${isDrag ? " dragging" : ""}${dropId === s.id ? " drop-target" : ""}`}
                  style={{
                    left: PAD + starts[i] * ppf,
                    width: Math.max(8, visible * ppf - 4),
                    transform: isDrag ? `translateX(${drag!.dx}px)` : undefined,
                  }}
                  onPointerDown={(e) => startBlockDrag(e, i)}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes(FX_MIME)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    if (dropId !== s.id) setDropId(s.id);
                  }}
                  onDragLeave={() => setDropId((d) => (d === s.id ? null : d))}
                  onDrop={(e) => {
                    setDropId(null);
                    const raw = e.dataTransfer.getData(FX_MIME);
                    if (!raw) return;
                    e.preventDefault();
                    p.onDropFx(s.id, JSON.parse(raw) as FxPayload);
                  }}
                  title="Clique para selecionar · arraste para reordenar · puxe as bordas para esticar ou aparar cortes"
                >
                  {s.type === "video" ? (
                    <WaveformBlock
                      scene={s}
                      mediaBase={project.mediaBase ?? ""}
                      width={Math.max(8, visible * ppf - 4)}
                      height={24}
                    />
                  ) : null}
                  <span className="block-type">
                    {SCENE_LABELS[s.type]}
                    {fxCount ? <span className="fx-badge" title={`${fxCount} efeito(s)`}>fx {fxCount}</span> : null}
                  </span>
                  <span className="block-text">{sceneSummary(s)}</span>
                  <span className="block-dur">{(s.duration / FPS).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s</span>
                  <span
                    className="handle handle-left"
                    onPointerDown={(e) => startTrim(e, i, "left")}
                    title={s.type === "video" ? "Arraste para recuperar ou aparar o início do corte (Alt = fino)" : "Arraste para ajustar o início (Alt = fino)"}
                    aria-label="Ajustar início da cena"
                  />
                  <span
                    className="handle handle-right"
                    onPointerDown={(e) => startTrim(e, i, "right")}
                    title={s.type === "video" ? "Arraste para esticar ou aparar o término do corte (Alt = fino)" : "Arraste para mudar a duração (Alt = fino)"}
                    aria-label="Ajustar término da cena"
                  />
                </div>
              );
            })}
            {project.scenes.map((s, i) =>
              trans[i] > 0 && s.transition ? (
                <button
                  key={`${s.id}-tr`}
                  className="tr-chip"
                  style={{ left: PAD + starts[i + 1] * ppf - 2, width: Math.max(22, trans[i] * ppf) }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    p.onSelect(s.id);
                    p.onSeek(starts[i + 1] + Math.round(trans[i] / 2));
                  }}
                  title={`Transição: ${TRANSITIONS[s.transition.type].name} (${(trans[i] / FPS).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s)`}
                  aria-label={`Transição ${TRANSITIONS[s.transition.type].name}`}
                >
                  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden>
                    <path d="M6 1 11 6 6 11 1 6Z" />
                  </svg>
                </button>
              ) : null,
            )}
            {dropX !== null ? <span className="drop" style={{ left: dropX - 2 }} /> : null}
          </div>

          <div
            className={`ov-row${overlayDropX !== null ? " dropping" : ""}`}
            style={{ height: Math.max(2, laneCount) * LANE_H + 8 }}
            onPointerDown={(e) => e.target === e.currentTarget && startScrub(e)}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(OVERLAY_MIME)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setOverlayDropX(PAD + frameFromClientX(e.clientX) * ppf);
            }}
            onDragLeave={() => setOverlayDropX(null)}
            onDrop={(e) => {
              setOverlayDropX(null);
              const raw = e.dataTransfer.getData(OVERLAY_MIME);
              if (!raw) return;
              e.preventDefault();
              p.onDropOverlay(frameFromClientX(e.clientX), JSON.parse(raw) as OverlayPayload);
            }}
          >
            {!overlayItems.length ? <span className="row-label">Ilustrações · arraste da biblioteca para cá</span> : null}
            {overlayItems.map(({ ov, win, lane }) => (
              <div
                key={ov.id}
                className={`ov-chip${ov.id === p.selectedOverlayId ? " selected" : ""}`}
                style={{ left: PAD + win.from * ppf, width: Math.max(10, win.duration * ppf - 2), top: 4 + lane * LANE_H }}
                onPointerDown={(e) => startOverlayDrag(e, ov.id, "move")}
                title={`${OVERLAYS[ov.kind].name} · arraste para mover`}
              >
                <span className="ov-name">{OVERLAYS[ov.kind].name}</span>
                <span className="ov-handle" onPointerDown={(e) => startOverlayDrag(e, ov.id, "resize")} aria-label="Mudar duração" />
              </div>
            ))}
            {overlayDropX !== null ? <span className="drop" style={{ left: overlayDropX - 1, top: 2, height: Math.max(2, laneCount) * LANE_H + 4 }} /> : null}
          </div>

          {captionChips.length ? (
            <div className="cap-row" onPointerDown={(e) => e.target === e.currentTarget && startScrub(e)}>
              {captionChips.map((c, i) => (
                <span key={i} className="cap-chip" style={{ left: PAD + c.from * ppf, width: Math.max(6, (c.to - c.from) * ppf - 2) }} title={c.text}>
                  {c.text}
                </span>
              ))}
            </div>
          ) : null}

          <span className="playhead" style={{ left: PAD + p.frame * ppf }} onPointerDown={startScrub} />
        </div>
      </div>
    </section>
  );
};
