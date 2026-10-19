import React, { useMemo, useState } from "react";
import { Info, Rows2 } from "lucide-react";
import {
  CAPTION_PRESETS,
  DEFAULT_CAPTIONS,
  DEFAULT_SPLIT_SCREEN,
  FPS,
  Project,
  Scene,
  VideoScene,
  Word,
  cutRange,
  normalizeSegments,
  restoreRange,
  segFrames,
} from "../remotion/types";
import { ApiError, pollJob, postJson } from "./api";
import { TranscriptEditor } from "./TranscriptEditor";
import { CaptionPicker, pickStyle } from "./CaptionPicker";

type Props = {
  scene: VideoScene;
  project: Project;
  sourceTime: number | null; // tempo do original sob o cursor, se o cursor estiver nesta cena
  onScene: (patch: Partial<Scene>, mergeKey?: string) => void;
  onProject: (patch: Partial<Project>, mergeKey?: string) => void;
  onSeekSource: (t: number) => void;
  flash: (msg: string) => void;
  aiReady: boolean;
  onOpenSettings: () => void;
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
};

const keptSeconds = (s: VideoScene) => s.segments.reduce((a, g) => a + segFrames(g) / FPS, 0);

export const VideoPanel: React.FC<Props> = ({ scene, project, sourceTime, onScene, onProject, onSeekSource, flash, aiReady, onOpenSettings }) => {
  const [job, setJob] = useState<{ stage: string; progress: number } | null>(null);
  const [threshold, setThreshold] = useState(-35);
  const [minSilence, setMinSilence] = useState(0.6);
  const [padding, setPadding] = useState(0.15);
  const [preview, setPreview] = useState<{ cuts: { start: number; end: number }[]; seconds: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const words = scene.words ?? [];
  const kept = keptSeconds(scene);
  const captions = { ...DEFAULT_CAPTIONS, ...(project.captions ?? { enabled: false }) };

  const isCut = useMemo(() => {
    const segs = scene.segments;
    return words.map((w) => {
      const mid = (w.start + w.end) / 2;
      return !segs.some((g) => mid >= g.start && mid <= g.end);
    });
  }, [words, scene.segments]);

  const setSegments = (segments: VideoScene["segments"]) =>
    onScene({ segments: normalizeSegments(segments, scene.srcDuration) } as Partial<Scene>);

  const transcribe = async () => {
    setJob({ stage: "Enviando", progress: 0 });
    try {
      const { jobId } = await postJson<{ jobId: string }>("/api/transcribe", { file: scene.file });
      const result = await pollJob<{ words: Word[] }>(jobId, (j) => setJob({ stage: j.stage, progress: j.progress }), 1000);
      onScene({ words: result.words } as Partial<Scene>);
      if (!project.captions) onProject({ captions: { ...DEFAULT_CAPTIONS } });
      flash(result.words.length ? `Transcrição pronta: ${result.words.length} palavras` : "Nenhuma fala encontrada no áudio");
    } catch (e) {
      flash(e instanceof ApiError || e instanceof Error ? e.message : String(e));
    } finally {
      setJob(null);
    }
  };

  const detect = async () => {
    setBusy(true);
    try {
      const r = await postJson<{ cuts: { start: number; end: number }[] }>("/api/silences", { file: scene.file, threshold, minSilence, padding });
      // Só conta o que ainda não foi cortado
      let segs = scene.segments;
      for (const c of r.cuts) segs = cutRange(segs, c.start, c.end);
      const after = segs.reduce((a, g) => a + (g.end - g.start), 0);
      const before = scene.segments.reduce((a, g) => a + (g.end - g.start), 0);
      setPreview({ cuts: r.cuts, seconds: Math.max(0, before - after) });
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const applySilences = () => {
    if (!preview) return;
    let segs = scene.segments;
    for (const c of preview.cuts) segs = cutRange(segs, c.start, c.end);
    setSegments(segs);
    flash(`${preview.cuts.length} silêncios removidos (${preview.seconds.toFixed(1)} s a menos)`);
    setPreview(null);
  };

  // Limites de um trecho de palavras, pegando metade do respiro antes e depois
  const bounds = (a: number, b: number) => {
    const from = a > 0 ? (words[a - 1].end + words[a].start) / 2 : Math.max(0, words[a].start - 0.05);
    const to = b < words.length - 1 ? (words[b].end + words[b + 1].start) / 2 : Math.min(scene.srcDuration, words[b].end + 0.12);
    return { from, to };
  };

  const cutWords = (a: number, b: number) => {
    const { from, to } = bounds(a, b);
    setSegments(cutRange(scene.segments, from, to));
  };
  const restoreWords = (a: number, b: number) => {
    const { from, to } = bounds(a, b);
    setSegments(restoreRange(scene.segments, from, to, scene.srcDuration));
  };

  return (
    <>
      <div className="video-info">
        <span className="vi-name" title={scene.name}>
          {scene.name}
        </span>
        <span className="vi-meta">
          {fmt(scene.srcDuration)} → <b>{fmt(kept)}</b>
          {scene.srcDuration - kept > 0.05 ? <em> · {(scene.srcDuration - kept).toFixed(1)} s cortados</em> : null}
        </span>
      </div>

      <div className="grid-2">
        <label className="field">
          <span className="field-label">Volume</span>
          <span className="slider">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={scene.volume}
              onChange={(e) => onScene({ volume: Number(e.target.value) } as Partial<Scene>, "volume")}
            />
            <span className="slider-val">{Math.round(scene.volume * 100)}%</span>
          </span>
        </label>
        <label className="field">
          <span className="field-label">Fundo / Enquadramento</span>
          <select
            className="input"
            value={scene.bgMode ?? (project.format === "portrait" && scene.srcWidth > scene.srcHeight ? "blur" : scene.fit)}
            onChange={(e) => {
              const val = e.target.value as VideoScene["bgMode"];
              onScene({
                bgMode: val,
                fit: val === "cover" ? "cover" : "contain",
              } as Partial<Scene>);
            }}
          >
            <option value="blur">Desfocado (Blur 9:16)</option>
            <option value="cover">Preencher (Cover)</option>
            <option value="contain">Ajustar (Contain)</option>
            <option value="black">Fundo Preto</option>
          </select>
        </label>
      </div>

      <div className="reframe-box">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span className="field-label" style={{ fontWeight: 600 }}>Smart Reframe (Posição & Zoom)</span>
          {(scene.panX !== undefined && scene.panX !== 0) || (scene.panY !== undefined && scene.panY !== 0) || (scene.scale !== undefined && scene.scale !== 1) ? (
            <button
              type="button"
              className="btn tiny ghost"
              style={{ padding: "2px 6px", fontSize: 11 }}
              onClick={() => onScene({ panX: 0, panY: 0, scale: 1 } as Partial<Scene>)}
            >
              Resetar
            </button>
          ) : null}
        </div>

        <div className="grid-2">
          <label className="field">
            <span className="field-label">Posição Horizontal (Pan X)</span>
            <span className="slider">
              <input
                type="range"
                min={-50}
                max={50}
                step={1}
                value={scene.panX ?? 0}
                onChange={(e) => onScene({ panX: Number(e.target.value) } as Partial<Scene>, "panX")}
              />
              <span className="slider-val">{(scene.panX ?? 0) > 0 ? `+${scene.panX}` : (scene.panX ?? 0)}%</span>
            </span>
          </label>
          <label className="field">
            <span className="field-label">Posição Vertical (Pan Y)</span>
            <span className="slider">
              <input
                type="range"
                min={-50}
                max={50}
                step={1}
                value={scene.panY ?? 0}
                onChange={(e) => onScene({ panY: Number(e.target.value) } as Partial<Scene>, "panY")}
              />
              <span className="slider-val">{(scene.panY ?? 0) > 0 ? `+${scene.panY}` : (scene.panY ?? 0)}%</span>
            </span>
          </label>
        </div>

        <div className="field" style={{ marginTop: 8 }}>
          <span className="field-label">Zoom / Escala</span>
          <span className="slider">
            <input
              type="range"
              min={0.8}
              max={2.0}
              step={0.05}
              value={scene.scale ?? 1.0}
              onChange={(e) => onScene({ scale: Number(e.target.value) } as Partial<Scene>, "scale")}
            />
            <span className="slider-val">{Math.round((scene.scale ?? 1.0) * 100)}%</span>
          </span>
        </div>

        {(scene.bgMode ?? (project.format === "portrait" && scene.srcWidth > scene.srcHeight ? "blur" : scene.fit)) === "blur" ? (
          <div className="grid-2" style={{ marginTop: 8 }}>
            <label className="field">
              <span className="field-label">Desfoque do Fundo</span>
              <span className="slider">
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={2}
                  value={scene.blurRadius ?? 25}
                  onChange={(e) => onScene({ blurRadius: Number(e.target.value) } as Partial<Scene>, "blurRadius")}
                />
                <span className="slider-val">{scene.blurRadius ?? 25}px</span>
              </span>
            </label>
            <label className="field">
              <span className="field-label">Brilho do Fundo</span>
              <span className="slider">
                <input
                  type="range"
                  min={0.2}
                  max={0.9}
                  step={0.05}
                  value={scene.blurBrightness ?? 0.55}
                  onChange={(e) => onScene({ blurBrightness: Number(e.target.value) } as Partial<Scene>, "blurBrightness")}
                />
                <span className="slider-val">{Math.round((scene.blurBrightness ?? 0.55) * 100)}%</span>
              </span>
            </label>
          </div>
        ) : null}
      </div>

      <div className="reframe-box" style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span className="field-label" style={{ fontWeight: 600 }}>Punch-in Zooms (Cortes Dinâmicos)</span>
          {scene.punchInPattern && scene.punchInPattern !== "none" ? (
            <button
              className="btn tiny ghost"
              style={{ padding: "2px 6px", fontSize: 11 }}
              onClick={() => onScene({ punchInPattern: "none", punchInZoom: 1.2 } as Partial<Scene>)}
            >
              Desativar
            </button>
          ) : null}
        </div>

        <div className="grid-2">
          <label className="field">
            <span className="field-label">Padrão de Zoom</span>
            <select
              className="input"
              value={scene.punchInPattern ?? "none"}
              onChange={(e) => onScene({ punchInPattern: e.target.value as VideoScene["punchInPattern"] } as Partial<Scene>)}
            >
              <option value="none">Desativado (Normal)</option>
              <option value="alternate">Alternar a cada corte (Reels/Shorts)</option>
              <option value="manual">Manual por segmento</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Intensidade do Salto</span>
            <span className="slider">
              <input
                type="range"
                min={1.1}
                max={1.4}
                step={0.05}
                disabled={scene.punchInPattern === "none"}
                value={scene.punchInZoom ?? 1.2}
                onChange={(e) => onScene({ punchInZoom: Number(e.target.value) } as Partial<Scene>, "punchInZoom")}
              />
              <span className="slider-val">{Math.round((scene.punchInZoom ?? 1.2) * 100)}%</span>
            </span>
          </label>
        </div>
        {scene.punchInPattern === "alternate" ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: "var(--muted, #8e94ab)", marginTop: 6, lineHeight: 1.4 }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Aproxima a câmera automaticamente nos cortes ímpares ({scene.segments.length} segmentos) para prender a atenção do espectador estilo MrBeast/Alex Hormozi.</span>
          </div>
        ) : null}
      </div>

      {/* Tela Dividida / Split Screen 50/50 (Fase B) */}
      <div className="reframe-box" style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span className="field-label" style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Rows2 size={15} />
            <span>Tela Dividida (Split Screen 50/50)</span>
          </span>
          {scene.splitScreen?.enabled ? (
            <button
              className="btn tiny ghost"
              style={{ padding: "2px 6px", fontSize: 11 }}
              onClick={() =>
                onScene({
                  splitScreen: {
                    ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                    enabled: false,
                  },
                } as Partial<Scene>)
              }
            >
              Desativar
            </button>
          ) : null}
        </div>

        <label className="toggle">
          <input
            type="checkbox"
            checked={!!scene.splitScreen?.enabled}
            onChange={(e) =>
              onScene({
                splitScreen: {
                  ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                  enabled: e.target.checked,
                },
              } as Partial<Scene>)
            }
          />
          <span>Ativar Tela Dividida (Vídeo Duplo / Gameplay / Reação)</span>
        </label>

        {scene.splitScreen?.enabled ? (
          <>
            <div className="grid-2" style={{ marginTop: 8 }}>
              <label className="field">
                <span className="field-label">Proporção da Divisão</span>
                <select
                  className="input"
                  value={scene.splitScreen.splitRatio ?? 0.5}
                  onChange={(e) =>
                    onScene({
                      splitScreen: {
                        ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                        splitRatio: Number(e.target.value),
                      },
                    } as Partial<Scene>)
                  }
                >
                  <option value={0.5}>50% / 50% (Metade e Metade)</option>
                  <option value={0.65}>65% / 35% (Mais Apresentador)</option>
                  <option value={0.35}>35% / 65% (Mais Conteúdo)</option>
                </select>
              </label>

              <label className="field">
                <span className="field-label">Posição do Apresentador</span>
                <select
                  className="input"
                  value={scene.splitScreen.reverse ? "bottom" : "top"}
                  onChange={(e) =>
                    onScene({
                      splitScreen: {
                        ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                        reverse: e.target.value === "bottom",
                      },
                    } as Partial<Scene>)
                  }
                >
                  <option value="top">Apresentador no Topo</option>
                  <option value="bottom">Apresentador na Base</option>
                </select>
              </label>
            </div>

            <label className="field" style={{ marginTop: 6 }}>
              <span className="field-label">Vídeo Secundário (Metade Oposta)</span>
              <select
                className="input"
                value={scene.splitScreen.assetId ?? ""}
                onChange={(e) =>
                  onScene({
                    splitScreen: {
                      ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                      assetId: e.target.value || undefined,
                    },
                  } as Partial<Scene>)
                }
              >
                <option value="">Mesmo Vídeo (Corte Duplo / Zoom Separado)</option>
                {(project.assets ?? [])
                  .filter((a) => a.kind === "video" || !a.kind)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (B-Roll)
                    </option>
                  ))}
              </select>
            </label>

            <div className="grid-2" style={{ marginTop: 6 }}>
              <label className="field">
                <span className="field-label">Posição Vertical (Pan Y)</span>
                <span className="slider">
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={scene.splitScreen.secondaryPanY ?? 0}
                    onChange={(e) =>
                      onScene(
                        {
                          splitScreen: {
                            ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                            secondaryPanY: Number(e.target.value),
                          },
                        } as Partial<Scene>,
                        "split-panY"
                      )
                    }
                  />
                  <span className="slider-val">{scene.splitScreen.secondaryPanY ?? 0}%</span>
                </span>
              </label>

              <label className="field">
                <span className="field-label">Posição Horizontal (Pan X)</span>
                <span className="slider">
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={scene.splitScreen.secondaryPanX ?? 0}
                    onChange={(e) =>
                      onScene(
                        {
                          splitScreen: {
                            ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                            secondaryPanX: Number(e.target.value),
                          },
                        } as Partial<Scene>,
                        "split-panX"
                      )
                    }
                  />
                  <span className="slider-val">{scene.splitScreen.secondaryPanX ?? 0}%</span>
                </span>
              </label>
            </div>

            <div className="grid-2" style={{ marginTop: 6 }}>
              <label className="field">
                <span className="field-label">Zoom do Vídeo Secundário</span>
                <span className="slider">
                  <input
                    type="range"
                    min={0.8}
                    max={2.0}
                    step={0.05}
                    value={scene.splitScreen.secondaryScale ?? 1.0}
                    onChange={(e) =>
                      onScene(
                        {
                          splitScreen: {
                            ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                            secondaryScale: Number(e.target.value),
                          },
                        } as Partial<Scene>,
                        "split-scale"
                      )
                    }
                  />
                  <span className="slider-val">{Math.round((scene.splitScreen.secondaryScale ?? 1.0) * 100)}%</span>
                </span>
              </label>

              <label className="field">
                <span className="field-label">Volume do Secundário</span>
                <span className="slider">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={scene.splitScreen.secondaryVolume ?? 0}
                    onChange={(e) =>
                      onScene(
                        {
                          splitScreen: {
                            ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                            secondaryVolume: Number(e.target.value),
                          },
                        } as Partial<Scene>,
                        "split-vol"
                      )
                    }
                  />
                  <span className="slider-val">
                    {(scene.splitScreen.secondaryVolume ?? 0) === 0 ? "Mudo" : `${Math.round((scene.splitScreen.secondaryVolume ?? 0) * 100)}%`}
                  </span>
                </span>
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={scene.splitScreen.divider !== false}
                  onChange={(e) =>
                    onScene({
                      splitScreen: {
                        ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                        divider: e.target.checked,
                      },
                    } as Partial<Scene>)
                  }
                />
                <span>Exibir linha divisória</span>
              </label>

              {scene.splitScreen.divider !== false ? (
                <label className="color-field" style={{ margin: 0, padding: "2px 8px" }}>
                  <input
                    type="color"
                    value={scene.splitScreen.dividerColor || project.theme.accent}
                    onChange={(e) =>
                      onScene({
                        splitScreen: {
                          ...(scene.splitScreen ?? DEFAULT_SPLIT_SCREEN),
                          dividerColor: e.target.value,
                        },
                      } as Partial<Scene>)
                    }
                  />
                  <span className="field-label" style={{ fontSize: 11 }}>Cor da Divisória</span>
                </label>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="divider" />
      <div className="group-title">Remover silêncios</div>
      <div className="grid-3">
        <label className="field">
          <span className="field-label">Limite</span>
          <select className="input" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
            <option value={-45}>Sensível</option>
            <option value={-40}>-40 dB</option>
            <option value={-35}>Normal</option>
            <option value={-30}>-30 dB</option>
            <option value={-25}>Ruidoso</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Pausa mín.</span>
          <select className="input" value={minSilence} onChange={(e) => setMinSilence(Number(e.target.value))}>
            {[0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.5, 2].map((v) => (
              <option key={v} value={v}>
                {v.toLocaleString("pt-BR")} s
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Respiro</span>
          <select className="input" value={padding} onChange={(e) => setPadding(Number(e.target.value))}>
            {[0, 0.05, 0.1, 0.15, 0.25, 0.4].map((v) => (
              <option key={v} value={v}>
                {v.toLocaleString("pt-BR")} s
              </option>
            ))}
          </select>
        </label>
      </div>
      {preview ? (
        <div className="callout-box">
          {preview.cuts.length ? (
            <>
              <span>
                {preview.cuts.length} pausas encontradas · <b>{preview.seconds.toFixed(1)} s</b> a menos
              </span>
              <div className="row-actions">
                <button className="btn primary" onClick={applySilences}>
                  Cortar pausas
                </button>
                <button className="btn ghost" onClick={() => setPreview(null)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <span>Nenhuma pausa nova com esses ajustes.</span>
              <button className="btn ghost" onClick={() => setPreview(null)}>
                Ok
              </button>
            </>
          )}
        </div>
      ) : (
        <button className="btn wide" onClick={detect} disabled={busy}>
          {busy ? "Analisando o áudio…" : "Encontrar pausas"}
        </button>
      )}
      {scene.segments.length > 1 || scene.srcDuration - kept > 0.05 ? (
        <button className="link" onClick={() => setSegments([{ start: 0, end: scene.srcDuration }])}>
          Restaurar todos os cortes
        </button>
      ) : null}

      <div className="divider" />
      <div className="group-title">
        Transcrição
        {words.length ? <span className="count">{words.length} palavras</span> : null}
      </div>
      {job ? (
        <div className="job">
          <span>{job.stage}</span>
          <span className="bar">
            <span style={{ transform: `scaleX(${Math.max(0.03, job.progress)})` }} />
          </span>
        </div>
      ) : !words.length ? (
        <>
          <p className="field-hint">
            Transcreve a fala no seu computador (Whisper). Com a transcrição você corta pelo texto, gera legendas e a edição por prompt entende o que é dito.
          </p>
          <button className="btn wide primary" onClick={transcribe}>
            Transcrever fala
          </button>
        </>
      ) : (
        <>
          <TranscriptEditor
            words={words}
            isCut={isCut}
            sourceTime={sourceTime}
            glossary={scene.glossary ?? ""}
            aiReady={aiReady}
            onWords={(w) => onScene({ words: w } as Partial<Scene>)}
            onGlossary={(g) => onScene({ glossary: g } as Partial<Scene>, "glossary")}
            onCut={cutWords}
            onRestore={restoreWords}
            onSeek={onSeekSource}
            onTranscribe={transcribe}
            onOpenSettings={onOpenSettings}
            flash={flash}
          />
        </>
      )}

      <div className="divider" />
      <div className="group-title">Legendas</div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={captions.enabled}
          disabled={!words.length}
          onChange={(e) => onProject({ captions: { ...captions, enabled: e.target.checked } })}
        />
        <span>Mostrar legendas {words.length ? "" : "(precisa da transcrição)"}</span>
      </label>
      {captions.enabled && words.length ? (
        <>
          <div className="field">
            <span className="field-label">Estilo</span>
            <CaptionPicker cfg={captions} onPick={(st) => onProject({ captions: pickStyle(captions, st) })} />
            <span className="field-hint">{CAPTION_PRESETS[captions.style]?.hint}</span>
          </div>

          <label className="field">
            <span className="field-label">Posição Vertical (Y)</span>
            <span className="slider">
              <input
                type="range"
                min={15}
                max={88}
                step={1}
                value={captions.offsetY ?? (captions.position === "top" ? 22 : captions.position === "middle" ? 50 : 74)}
                onChange={(e) => onProject({ captions: { ...captions, offsetY: Number(e.target.value) } }, "cap-offsetY")}
              />
              <span className="slider-val">
                {captions.offsetY ?? (captions.position === "top" ? 22 : captions.position === "middle" ? 50 : 74)}%
              </span>
            </span>
            <div className="cap-pos-presets">
              <button
                type="button"
                className={`cap-pos-btn${(captions.offsetY ?? 74) === 74 ? " active" : ""}`}
                onClick={() => onProject({ captions: { ...captions, offsetY: 74, position: "bottom" } })}
              >
                Reels Safe (74%)
              </button>
              <button
                type="button"
                className={`cap-pos-btn${(captions.offsetY ?? 74) === 50 ? " active" : ""}`}
                onClick={() => onProject({ captions: { ...captions, offsetY: 50, position: "middle" } })}
              >
                Centro (50%)
              </button>
              <button
                type="button"
                className={`cap-pos-btn${(captions.offsetY ?? 74) === 22 ? " active" : ""}`}
                onClick={() => onProject({ captions: { ...captions, offsetY: 22, position: "top" } })}
              >
                Topo (22%)
              </button>
            </div>
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={!!captions.autoEmoji}
              onChange={(e) => onProject({ captions: { ...captions, autoEmoji: e.target.checked } })}
            />
            <span>Destacar palavras-chave com emojis nas legendas</span>
          </label>
        </>
      ) : null}
    </>
  );
};
