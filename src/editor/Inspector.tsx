import React, { useState } from "react";
import { CaptionPicker, pickStyle } from "./CaptionPicker";
import { uploadFile } from "./api";
import { playSfxPreview } from "../remotion/sfx";
import {
  CAPTION_PRESETS,
  DEFAULT_CAPTIONS,
  DEFAULT_BACKGROUND_AUDIO,
  DEFAULT_PROGRESS_BAR,
  ProgressBarSettings,
  BackgroundAudio,
  BackgroundAudioPreset,
  ChartScene,
  DIRECTIONS,
  DEFAULT_TRANSITION,
  Direction,
  EFFECTS,
  EFFECT_CATEGORIES,
  EffectInstance,
  MAX_TRANSITION_FRAMES,
  MIN_TRANSITION_FRAMES,
  TRANSITIONS,
  TransitionType,
  FORMATS,
  FPS,
  FormatId,
  MAX_SCENE_FRAMES,
  MIN_SCENE_FRAMES,
  Project,
  SCENE_LABELS,
  Scene,
  StatsScene,
  THEME_PRESETS,
  Theme,
  outputWords,
  DEFAULT_HEADLINE,
  HeadlineSettings,
  HeadlineStyle,
  VIRAL_FONTS,
} from "../remotion/types";
import { BrandKitManager } from "./BrandKitManager";

type Props = {
  project: Project;
  scene: Scene | null;
  isLastScene: boolean;
  videoPanel?: React.ReactNode; // painel da cena de vídeo
  overlayPanel?: React.ReactNode; // painel da ilustração selecionada
  tab?: "scene" | "project";
  onTab?: (t: "scene" | "project") => void;
  onScene: (patch: Partial<Scene>, mergeKey?: string) => void;
  onProject: (patch: Partial<Project>, mergeKey?: string) => void;
  onRepurposeForSocial?: () => void;
  flash?: (msg: string) => void;
};

// Aceita "1.250,5" (pt-BR) e "1250.5"
export const parseNumber = (raw: string) => {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return 0;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint ? <span className="field-hint">{hint}</span> : null}
  </label>
);

const NumberText: React.FC<{
  value: number;
  onChange: (n: number) => void;
  ariaLabel?: string;
  className?: string;
}> = ({ value, onChange, ariaLabel, className }) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className={className ?? "input"}
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft ?? value.toLocaleString("pt-BR", { maximumFractionDigits: 3, useGrouping: false })}
      onFocus={(e) => setDraft(e.target.value)}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parseNumber(e.target.value));
      }}
      onBlur={() => setDraft(null)}
    />
  );
};

const ChartEditor: React.FC<{ s: ChartScene; onScene: Props["onScene"] }> = ({ s, onScene }) => {
  const [paste, setPaste] = useState("");
  const setRow = (i: number, patch: Partial<ChartScene["data"][number]>, key: string) =>
    onScene({ data: s.data.map((d, j) => (j === i ? { ...d, ...patch } : d)) } as Partial<Scene>, key);

  const applyPaste = () => {
    const rows = paste
      .split(/\r?\n/)
      .map((l) => l.split(/\t|;/))
      .filter((c) => c.length >= 2 && c[0].trim())
      .map((c) => ({ label: c[0].trim(), value: parseNumber(c[1]) }));
    if (rows.length) {
      onScene({ data: rows } as Partial<Scene>);
      setPaste("");
    }
  };

  return (
    <>
      <Field label="Título">
        <input className="input" value={s.title} onChange={(e) => onScene({ title: e.target.value } as Partial<Scene>, "title")} />
      </Field>
      <Field label="Subtítulo">
        <input className="input" value={s.subtitle} onChange={(e) => onScene({ subtitle: e.target.value } as Partial<Scene>, "subtitle")} />
      </Field>
      <Field label="Unidade" hint="Aparece depois de cada valor, ex.: %, t, h">
        <input className="input" value={s.unit} onChange={(e) => onScene({ unit: e.target.value } as Partial<Scene>, "unit")} />
      </Field>

      <div className="group-title">Dados</div>
      <div className="rows">
        {s.data.map((d, i) => (
          <div className="row" key={i}>
            <input className="input" aria-label={`Rótulo ${i + 1}`} value={d.label} onChange={(e) => setRow(i, { label: e.target.value }, `label-${i}`)} />
            <NumberText className="input num" ariaLabel={`Valor ${i + 1}`} value={d.value} onChange={(n) => setRow(i, { value: n }, `value-${i}`)} />
            <button
              className="btn icon ghost"
              aria-label={`Remover linha ${i + 1}`}
              disabled={s.data.length <= 1}
              onClick={() => onScene({ data: s.data.filter((_, j) => j !== i) } as Partial<Scene>)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className="btn ghost wide"
        disabled={s.data.length >= 12}
        onClick={() => onScene({ data: [...s.data, { label: `Item ${s.data.length + 1}`, value: 50 }] } as Partial<Scene>)}
      >
        + Linha
      </button>

      <Field label="Colar do Excel" hint="Duas colunas: rótulo e valor. Substitui os dados acima.">
        <textarea
          className="input area"
          rows={4}
          placeholder={"Seg\t62\nTer\t78"}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
      </Field>
      <button className="btn wide" disabled={!paste.trim()} onClick={applyPaste}>
        Aplicar dados colados
      </button>
    </>
  );
};

const StatsEditor: React.FC<{ s: StatsScene; onScene: Props["onScene"] }> = ({ s, onScene }) => {
  const setStat = (i: number, patch: Partial<StatsScene["stats"][number]>, key: string) =>
    onScene({ stats: s.stats.map((d, j) => (j === i ? { ...d, ...patch } : d)) } as Partial<Scene>, key);
  return (
    <>
      <Field label="Título" hint="Deixe vazio para mostrar só os números">
        <input className="input" value={s.title} onChange={(e) => onScene({ title: e.target.value } as Partial<Scene>, "title")} />
      </Field>
      {s.stats.map((st, i) => (
        <div className="stat-edit" key={i}>
          <div className="group-title">
            Número {i + 1}
            <button
              className="link danger"
              disabled={s.stats.length <= 1}
              onClick={() => onScene({ stats: s.stats.filter((_, j) => j !== i) } as Partial<Scene>)}
            >
              Remover
            </button>
          </div>
          <div className="grid-3">
            <Field label="Valor">
              <NumberText value={st.value} onChange={(n) => setStat(i, { value: n }, `v-${i}`)} />
            </Field>
            <Field label="Casas">
              <select className="input" value={st.decimals} onChange={(e) => setStat(i, { decimals: Number(e.target.value) }, `d-${i}`)}>
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </Field>
            <Field label="Sufixo">
              <input className="input" value={st.suffix} onChange={(e) => setStat(i, { suffix: e.target.value }, `s-${i}`)} />
            </Field>
          </div>
          <Field label="Legenda">
            <input className="input" value={st.label} onChange={(e) => setStat(i, { label: e.target.value }, `l-${i}`)} />
          </Field>
        </div>
      ))}
      <button
        className="btn ghost wide"
        disabled={s.stats.length >= 4}
        onClick={() => onScene({ stats: [...s.stats, { value: 100, decimals: 0, suffix: "", label: "Novo" }] } as Partial<Scene>)}
      >
        + Número
      </button>
    </>
  );
};

const SceneFields: React.FC<{ s: Scene; onScene: Props["onScene"] }> = ({ s, onScene }) => {
  switch (s.type) {
    case "title":
      return (
        <>
          <Field label="Chamada" hint="Texto pequeno acima do título">
            <input className="input" value={s.kicker} onChange={(e) => onScene({ kicker: e.target.value } as Partial<Scene>, "kicker")} />
          </Field>
          <Field label="Título">
            <textarea className="input area" rows={2} value={s.title} onChange={(e) => onScene({ title: e.target.value } as Partial<Scene>, "title")} />
          </Field>
          <Field label="Destacar" hint="Trecho do título que fica na cor de destaque">
            <input className="input" value={s.highlight} onChange={(e) => onScene({ highlight: e.target.value } as Partial<Scene>, "highlight")} />
          </Field>
        </>
      );
    case "chart":
      return <ChartEditor s={s} onScene={onScene} />;
    case "stats":
      return <StatsEditor s={s} onScene={onScene} />;
    case "text":
      return (
        <>
          <Field label="Frase">
            <textarea className="input area" rows={4} value={s.text} onChange={(e) => onScene({ text: e.target.value } as Partial<Scene>, "text")} />
          </Field>
          <Field label="Autor" hint="Opcional">
            <input className="input" value={s.author} onChange={(e) => onScene({ author: e.target.value } as Partial<Scene>, "author")} />
          </Field>
        </>
      );
    case "outro":
      return (
        <>
          <Field label="Marca">
            <input className="input" value={s.brand} onChange={(e) => onScene({ brand: e.target.value } as Partial<Scene>, "brand")} />
          </Field>
          <Field label="Frase final">
            <input className="input" value={s.tag} onChange={(e) => onScene({ tag: e.target.value } as Partial<Scene>, "tag")} />
          </Field>
        </>
      );
  }
};

// Lista de efeitos aplicados com ajuste de intensidade
const EffectList: React.FC<{
  effects: EffectInstance[];
  onChange: (next: EffectInstance[], mergeKey?: string) => void;
  empty: string;
}> = ({ effects, onChange, empty }) => {
  if (!effects.length) return <p className="field-hint">{empty}</p>;
  return (
    <div className="fx-list">
      {effects.map((e) => (
        <div className="fx-item" key={e.id}>
          <div className="fx-item-head">
            <span className={`dot c-${EFFECTS[e.type].category}`} />
            <span className="fx-item-name">{EFFECTS[e.type].name}</span>
            <span className="fx-item-cat">{EFFECT_CATEGORIES[EFFECTS[e.type].category]}</span>
            <button className="btn icon ghost sm" aria-label={`Remover ${EFFECTS[e.type].name}`} onClick={() => onChange(effects.filter((x) => x.id !== e.id))}>
              ×
            </button>
          </div>
          <label className="slider">
            <span className="sr">Intensidade</span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={e.intensity}
              onChange={(ev) =>
                onChange(
                  effects.map((x) => (x.id === e.id ? { ...x, intensity: Number(ev.target.value) } : x)),
                  `int-${e.id}`,
                )
              }
            />
            <span className="slider-val">{Math.round(e.intensity * 100)}%</span>
          </label>
        </div>
      ))}
    </div>
  );
};

const TransitionEditor: React.FC<{ scene: Scene; isLast: boolean; onScene: Props["onScene"] }> = ({ scene, isLast, onScene }) => {
  if (isLast) return <p className="field-hint">A última cena não tem transição: ela encerra o vídeo.</p>;
  const t = scene.transition ?? DEFAULT_TRANSITION;
  const set = (patch: Partial<typeof t>, key?: string) => onScene({ transition: { ...t, ...patch } } as Partial<Scene>, key);
  return (
    <>
      <Field label="Tipo">
        <select className="input" value={t.type} onChange={(e) => set({ type: e.target.value as TransitionType })}>
          {(Object.keys(TRANSITIONS) as TransitionType[]).map((k) => (
            <option key={k} value={k}>
              {TRANSITIONS[k].name}
            </option>
          ))}
        </select>
      </Field>
      {t.type !== "cut" ? (
        <>
          {TRANSITIONS[t.type].directional ? (
            <Field label="Direção">
              <select className="input" value={t.direction} onChange={(e) => set({ direction: e.target.value as Direction })}>
                {(Object.keys(DIRECTIONS) as Direction[]).map((d) => (
                  <option key={d} value={d}>
                    {DIRECTIONS[d]}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="grid-2">
            <Field label="Efeito Sonoro (SFX)">
              <select
                className="input"
                value={t.sfx ?? "whoosh"}
                onChange={(e) => {
                  const val = e.target.value as any;
                  set({ sfx: val });
                  if (val !== "none") playSfxPreview(val);
                }}
              >
                <option value="none">Nenhum</option>
                <option value="whoosh">Whoosh suave</option>
                <option value="swish">Swish rápido</option>
                <option value="pop">Pop</option>
              </select>
            </Field>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
              <button
                type="button"
                className="btn ghost sm wide"
                disabled={!t.sfx || t.sfx === "none"}
                onClick={() => playSfxPreview(t.sfx ?? "whoosh")}
                title="Ouvir som da transição"
              >
                🔊 Ouvir
              </button>
            </div>
          </div>
          <label className="field">
            <span className="field-label">Duração da transição</span>
            <span className="slider">
              <input
                type="range"
                min={MIN_TRANSITION_FRAMES}
                max={MAX_TRANSITION_FRAMES}
                step={3}
                value={t.duration}
                onChange={(e) => set({ duration: Number(e.target.value) }, "tdur")}
              />
              <span className="slider-val">{(t.duration / FPS).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s</span>
            </span>
          </label>
        </>
      ) : null}
    </>
  );
};

const CaptionFields: React.FC<{ project: Project; onProject: Props["onProject"] }> = ({ project, onProject }) => {
  const hasWords = project.scenes.some((s) => s.type === "video" && s.words?.length);
  const c = { ...DEFAULT_CAPTIONS, ...(project.captions ?? { enabled: false }) };
  const set = (patch: Partial<typeof c>, key?: string) => onProject({ captions: { ...c, ...patch } }, key);
  if (!hasWords) return <p className="field-hint">Importe um vídeo e transcreva a fala para gerar legendas.</p>;

  const currentY = c.offsetY ?? (c.position === "top" ? 22 : c.position === "middle" ? 50 : 74);

  return (
    <>
      <label className="toggle">
        <input type="checkbox" checked={c.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        <span>Mostrar legendas</span>
      </label>
      {c.enabled ? (
        <>
          <div className="field">
            <span className="field-label">Estilo</span>
            <CaptionPicker cfg={c} onPick={(st) => onProject({ captions: pickStyle(c, st) })} />
            <span className="field-hint">{CAPTION_PRESETS[c.style]?.hint}</span>
          </div>

          <label className="field">
            <span className="field-label">Posição Vertical (Altura Y)</span>
            <span className="slider">
              <input
                type="range"
                min={15}
                max={88}
                step={1}
                value={currentY}
                onChange={(e) => set({ offsetY: Number(e.target.value) }, "cap-offsetY")}
              />
              <span className="slider-val">{currentY}%</span>
            </span>
            <div className="cap-pos-presets">
              <button
                type="button"
                className={`cap-pos-btn${currentY === 22 ? " active" : ""}`}
                onClick={() => set({ offsetY: 22, position: "top" })}
              >
                Topo (22%)
              </button>
              <button
                type="button"
                className={`cap-pos-btn${currentY === 50 ? " active" : ""}`}
                onClick={() => set({ offsetY: 50, position: "middle" })}
              >
                Centro (50%)
              </button>
              <button
                type="button"
                className={`cap-pos-btn${currentY === 74 ? " active" : ""}`}
                onClick={() => set({ offsetY: 74, position: "bottom" })}
              >
                Reels Safe (74%)
              </button>
              <button
                type="button"
                className={`cap-pos-btn${currentY === 84 ? " active" : ""}`}
                onClick={() => set({ offsetY: 84, position: "bottom" })}
              >
                Base (84%)
              </button>
            </div>
          </label>

          <div className="grid-2">
            <Field label="Palavras por vez">
              <select className="input" value={c.wordsPerPage} onChange={(e) => set({ wordsPerPage: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fonte das Legendas">
              <select
                className="input"
                value={c.fontFamily ?? "Inter"}
                onChange={(e) => set({ fontFamily: e.target.value })}
              >
                {VIRAL_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="field">
            <label className="field">
              <span className="field-label">Tamanho</span>
              <span className="slider">
                <input type="range" min={0.6} max={1.8} step={0.05} value={c.size} onChange={(e) => set({ size: Number(e.target.value) }, "cap-size")} />
                <span className="slider-val">{Math.round(c.size * 100)}%</span>
              </span>
            </label>
          </div>

          <div className="grid-2">
            <label className="color-field">
              <input type="color" value={c.color} onChange={(e) => set({ color: e.target.value }, "cap-color")} />
              <span>Destaque</span>
              <code>{c.color}</code>
            </label>
            <label className="color-field">
              <input type="color" value={c.textColor || "#f7f7fa"} onChange={(e) => set({ textColor: e.target.value }, "cap-textcolor")} />
              <span>Texto base</span>
              <code>{c.textColor || "#f7f7fa"}</code>
            </label>
          </div>

          {c.style === "hormozi" || c.style === "mrbeast" || c.style === "glow" || c.style === "impact" || c.style === "pop" ? (
            <label className="field">
              <span className="field-label">Pop da palavra ativa (Zoom)</span>
              <span className="slider">
                <input
                  type="range"
                  min={1.0}
                  max={1.4}
                  step={0.02}
                  value={c.activeScale ?? (c.style === "mrbeast" ? 1.2 : c.style === "glow" ? 1.08 : 1.15)}
                  onChange={(e) => set({ activeScale: Number(e.target.value) }, "cap-activescale")}
                />
                <span className="slider-val">
                  {Math.round((c.activeScale ?? (c.style === "mrbeast" ? 1.2 : c.style === "glow" ? 1.08 : 1.15)) * 100)}%
                </span>
              </span>
            </label>
          ) : null}

          <label className="toggle">
            <input type="checkbox" checked={!!c.autoEmoji} onChange={(e) => set({ autoEmoji: e.target.checked })} />
            <span>Emojis automáticos em palavras-chave (🔥, 💸, 🚀, 🎯...)</span>
          </label>

          <label className="toggle">
            <input type="checkbox" checked={c.uppercase} onChange={(e) => set({ uppercase: e.target.checked })} />
            <span>Caixa alta</span>
          </label>
        </>
      ) : null}
    </>
  );
};

const AudioTrackEditor: React.FC<{
  project: Project;
  onProject: Props["onProject"];
  flash?: (msg: string) => void;
}> = ({ project, onProject, flash }) => {
  const audio = project.audio ?? DEFAULT_BACKGROUND_AUDIO;
  const set = (patch: Partial<BackgroundAudio>, key?: string) =>
    onProject({ audio: { ...audio, ...patch } }, key);

  const [uploading, setUploading] = useState(false);
  const wordsCount = outputWords(project).length;

  const onUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const r = await uploadFile<{ kind: string; file: string; name: string }>(file);
      set({ enabled: true, preset: "custom", file: r.file, name: r.name });
      flash?.(`Trilha "${r.name}" adicionada com sucesso!`);
    } catch (err) {
      flash?.(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <label className="toggle">
        <input
          type="checkbox"
          checked={audio.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        <span>Ativar trilha de fundo</span>
      </label>

      {audio.enabled ? (
        <>
          <Field label="Música de Fundo">
            <select
              className="input"
              value={audio.preset ?? "lofi-chill"}
              onChange={(e) => {
                const val = e.target.value as BackgroundAudioPreset;
                if (val !== "custom") {
                  set({ preset: val, file: undefined, name: undefined });
                } else {
                  set({ preset: "custom" });
                }
              }}
            >
              <option value="lofi-chill">🎵 Lo-Fi Chill (Suave / Relaxante)</option>
              <option value="corporate-upbeat">✨ Upbeat Pop (Dinâmico / Positivo)</option>
              <option value="cinematic-pulse">🎬 Cinematic Pulse (Foco / Profundo)</option>
              <option value="custom">📁 Música Própria (Upload)</option>
            </select>
          </Field>

          {audio.preset === "custom" || audio.file ? (
            <div className="audio-upload-box">
              <span className="audio-file-name" title={audio.name ?? audio.file}>
                {audio.name ? `🎵 ${audio.name}` : audio.file ? `🎵 ${audio.file}` : "Nenhum arquivo enviado"}
              </span>
              <label className="btn ghost sm" style={{ cursor: "pointer" }}>
                {uploading ? "Enviando…" : "Escolher arquivo"}
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                  style={{ display: "none" }}
                  disabled={uploading}
                  onChange={onUploadAudio}
                />
              </label>
            </div>
          ) : null}

          <div className="grid-2">
            <label className="field">
              <span className="field-label">Volume Geral</span>
              <span className="slider">
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={audio.volume}
                  onChange={(e) => set({ volume: Number(e.target.value) }, "bg-vol")}
                />
                <span className="slider-val">{Math.round(audio.volume * 100)}%</span>
              </span>
            </label>

            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "8px" }}>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={audio.loop !== false}
                  onChange={(e) => set({ loop: e.target.checked })}
                />
                <span>Repetir em loop</span>
              </label>
            </div>
          </div>

          <div className="divider" style={{ margin: "8px 0" }} />

          {/* Auto-Ducking */}
          <label className="toggle">
            <input
              type="checkbox"
              checked={audio.ducking}
              onChange={(e) => set({ ducking: e.target.checked })}
            />
            <span>Auto-Ducking inteligente (abaixa na fala)</span>
          </label>

          {audio.ducking ? (
            <>
              <div className="ducking-badge">
                {wordsCount > 0 ? (
                  <span>✨ <b>{wordsCount} palavras</b> detectadas para auto-ducking suave</span>
                ) : (
                  <span>ℹ️ Sem transcrição ainda (volume tocará constante)</span>
                )}
              </div>

              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Volume durante a fala</span>
                  <span className="slider">
                    <input
                      type="range"
                      min={0}
                      max={0.25}
                      step={0.01}
                      value={audio.duckingVolume}
                      onChange={(e) => set({ duckingVolume: Number(e.target.value) }, "duck-vol")}
                    />
                    <span className="slider-val">{Math.round(audio.duckingVolume * 100)}%</span>
                  </span>
                </label>

                <label className="field">
                  <span className="field-label">Transição suave (Ramp)</span>
                  <span className="slider">
                    <input
                      type="range"
                      min={100}
                      max={600}
                      step={50}
                      value={audio.duckingRampMs ?? 250}
                      onChange={(e) => set({ duckingRampMs: Number(e.target.value) }, "duck-ramp")}
                    />
                    <span className="slider-val">{audio.duckingRampMs ?? 250} ms</span>
                  </span>
                </label>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
};

const THEME_FIELDS: { key: keyof Theme; label: string }[] = [
  { key: "bg", label: "Fundo" },
  { key: "glow", label: "Brilho do fundo" },
  { key: "ink", label: "Texto" },
  { key: "muted", label: "Texto secundário" },
  { key: "accent", label: "Destaque" },
  { key: "rule", label: "Linhas e barras" },
];

const ProgressBarFields: React.FC<{ project: Project; onProject: Props["onProject"]; flash?: Props["flash"] }> = ({
  project,
  onProject,
  flash,
}) => {
  const pb = project.progressBar ?? DEFAULT_PROGRESS_BAR;
  const set = (patch: Partial<ProgressBarSettings>, key?: string) =>
    onProject({ progressBar: { ...pb, ...patch } }, key);

  return (
    <>
      <label className="toggle">
        <input
          type="checkbox"
          checked={pb.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        <span>Ativar barra de progresso no topo/base</span>
      </label>

      {pb.enabled ? (
        <>
          <div className="grid-2">
            <Field label="Posição">
              <select
                className="input"
                value={pb.position}
                onChange={(e) => set({ position: e.target.value as "top" | "bottom" })}
              >
                <option value="bottom">Base (Rodapé)</option>
                <option value="top">Topo</option>
              </select>
            </Field>

            <label className="field">
              <span className="field-label">Espessura</span>
              <span className="slider">
                <input
                  type="range"
                  min={3}
                  max={16}
                  step={1}
                  value={pb.height}
                  onChange={(e) => set({ height: Number(e.target.value) }, "pb-height")}
                />
                <span className="slider-val">{pb.height}px</span>
              </span>
            </label>
          </div>

          <div className="field">
            <label className="color-field" style={{ marginBottom: 6 }}>
              <input
                type="color"
                value={pb.color || project.theme.accent}
                onChange={(e) => set({ color: e.target.value }, "pb-color")}
              />
              <span>Cor do Progresso</span>
              <code>{pb.color || project.theme.accent}</code>
            </label>

            <button
              type="button"
              className="btn ghost sm"
              style={{ width: "100%", fontSize: 11 }}
              onClick={() => {
                set({ color: project.theme.accent });
                flash?.("Cor do progresso sincronizada com o tema!");
              }}
              title="Redefinir cor da barra para a cor de destaque do tema atual"
            >
              🔄 Sincronizar com cor de destaque ({project.theme.accent})
            </button>
          </div>
        </>
      ) : null}
    </>
  );
};

const HeadlineFields: React.FC<{
  project: Project;
  onProject: Props["onProject"];
  flash?: Props["flash"];
}> = ({ project, onProject }) => {
  const hl = project.headline ?? DEFAULT_HEADLINE;
  const set = (patch: Partial<HeadlineSettings>, key?: string) =>
    onProject({ headline: { ...hl, ...patch } }, key);

  return (
    <>
      <label className="toggle">
        <input
          type="checkbox"
          checked={hl.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        <span>Ativar manchete de topo (Hook de 3s)</span>
      </label>

      {hl.enabled ? (
        <>
          <Field label="Texto da Manchete / Gancho">
            <input
              type="text"
              className="input"
              value={hl.text}
              placeholder="Ex: O SEGREDO QUE NINGUÉM CONTA"
              onChange={(e) => set({ text: e.target.value }, "hl-text")}
            />
          </Field>

          <div className="grid-2">
            <Field label="Tempo de Exibição">
              <select
                className="input"
                value={hl.durationSeconds}
                onChange={(e) => set({ durationSeconds: Number(e.target.value) })}
              >
                <option value={3}>Primeiros 3 segundos (Recomendado)</option>
                <option value={5}>Primeiros 5 segundos</option>
                <option value={8}>Primeiros 8 segundos</option>
                <option value={0}>Vídeo todo (Fixo)</option>
              </select>
            </Field>

            <Field label="Estilo Visual">
              <select
                className="input"
                value={hl.style}
                onChange={(e) => set({ style: e.target.value as HeadlineStyle })}
              >
                <option value="badge">Badge Sólido (Hormozi)</option>
                <option value="bold">Texto de Impacto (Bold)</option>
                <option value="highlight">Marca-Texto (Pill)</option>
                <option value="neon">Neon Glow (Aura)</option>
              </select>
            </Field>
          </div>

          <div className="grid-2">
            <Field label="Fonte do Gancho">
              <select
                className="input"
                value={hl.fontFamily ?? "Inter"}
                onChange={(e) => set({ fontFamily: e.target.value })}
              >
                {VIRAL_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>

            <label className="field">
              <span className="field-label">Tamanho da Fonte</span>
              <span className="slider">
                <input
                  type="range"
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  value={hl.fontSize ?? 1.0}
                  onChange={(e) => set({ fontSize: Number(e.target.value) }, "hl-size")}
                />
                <span className="slider-val">{Math.round((hl.fontSize ?? 1.0) * 100)}%</span>
              </span>
            </label>
          </div>

          <div className="grid-2">
            <label className="color-field">
              <input
                type="color"
                value={hl.color || project.theme.accent}
                onChange={(e) => set({ color: e.target.value }, "hl-color")}
              />
              <span>Destaque</span>
              <code>{hl.color || project.theme.accent}</code>
            </label>

            <label className="color-field">
              <input
                type="color"
                value={hl.textColor || "#121319"}
                onChange={(e) => set({ textColor: e.target.value }, "hl-textcolor")}
              />
              <span>Texto</span>
              <code>{hl.textColor || "#121319"}</code>
            </label>
          </div>

          <label className="toggle">
            <input
              type="checkbox"
              checked={hl.uppercase !== false}
              onChange={(e) => set({ uppercase: e.target.checked })}
            />
            <span>Caixa alta</span>
          </label>
        </>
      ) : null}
    </>
  );
};

const ProjectFields: React.FC<{
  project: Project;
  onProject: Props["onProject"];
  onRepurposeForSocial?: Props["onRepurposeForSocial"];
  flash?: Props["flash"];
}> = ({ project, onProject, onRepurposeForSocial, flash }) => (
  <>
    <BrandKitManager
      project={project}
      onProject={onProject}
      onRepurposeForSocial={onRepurposeForSocial}
      flash={flash}
    />

    <div className="divider" style={{ margin: "16px 0 12px" }} />

    <Field label="Nome do projeto" hint="Usado no nome do arquivo exportado">
      <input className="input" value={project.name} onChange={(e) => onProject({ name: e.target.value }, "name")} />
    </Field>
    <Field label="Formato">
      <select className="input" value={project.format} onChange={(e) => onProject({ format: e.target.value as FormatId })}>
        {(Object.keys(FORMATS) as FormatId[]).map((f) => (
          <option key={f} value={f}>
            {FORMATS[f].label}
          </option>
        ))}
      </select>
    </Field>

    <div className="group-title">Temas prontos</div>
    <div className="presets">
      {THEME_PRESETS.map((t) => {
        const isCurrent = project.theme.bg === t.theme.bg && project.theme.accent === t.theme.accent;
        return (
          <button
            key={t.name}
            type="button"
            className={`preset ${isCurrent ? "active" : ""}`}
            onClick={() => {
              const patch: Partial<Project> = {
                theme: t.theme,
              };
              if (project.captions) {
                patch.captions = {
                  ...project.captions,
                  color: t.theme.accent,
                };
              }
              if (project.progressBar) {
                patch.progressBar = {
                  ...project.progressBar,
                  color: t.theme.accent,
                };
              }
              onProject(patch);
              flash?.(`🎨 Tema "${t.name}" aplicado com sucesso!`);
            }}
            title={`Aplicar tema ${t.name}`}
          >
            <span className="preset-sw" style={{ background: t.theme.bg }}>
              <span style={{ background: t.theme.ink }} />
              <span style={{ background: t.theme.accent }} />
            </span>
            {t.name} {isCurrent ? "✓" : ""}
          </button>
        );
      })}
    </div>

    <div className="group-title">Manchete de Topo (Gancho Viral)</div>
    <HeadlineFields project={project} onProject={onProject} flash={flash} />

    <div className="group-title">Barra de Progresso (Retenção)</div>
    <ProgressBarFields project={project} onProject={onProject} flash={flash} />

    <div className="group-title">Áudio de Fundo e Trilha Sonora</div>
    <AudioTrackEditor project={project} onProject={onProject} flash={flash} />

    <div className="group-title">Legendas</div>
    <CaptionFields project={project} onProject={onProject} />

    <div className="group-title">Efeitos do vídeo inteiro</div>
    <EffectList
      effects={project.effects ?? []}
      onChange={(next, key) => onProject({ effects: next }, key)}
      empty="Nenhum. Na biblioteca, use “Vídeo todo” num efeito de cor ou sobreposição."
    />

    <div className="group-title">Cores</div>
    <div className="colors">
      {THEME_FIELDS.map((f) => (
        <label key={f.key} className="color-field">
          <input
            type="color"
            value={project.theme[f.key]}
            onChange={(e) => {
              const nextTheme = { ...project.theme, [f.key]: e.target.value };
              const patch: Partial<Project> = { theme: nextTheme };
              if (f.key === "accent") {
                if (project.captions) patch.captions = { ...project.captions, color: e.target.value };
                if (project.progressBar) patch.progressBar = { ...project.progressBar, color: e.target.value };
              }
              onProject(patch, `color-${f.key}`);
            }}
          />
          <span>{f.label}</span>
          <code>{project.theme[f.key]}</code>
        </label>
      ))}
    </div>
  </>
);

export const Inspector: React.FC<Props> = ({
  project,
  scene,
  isLastScene,
  videoPanel,
  overlayPanel,
  tab: tabProp,
  onTab,
  onScene,
  onProject,
  onRepurposeForSocial,
  flash,
}) => {
  const [tabState, setTabState] = useState<"scene" | "project">("scene");
  const tab = tabProp ?? tabState;
  const setTab = onTab ?? setTabState;
  return (
    <aside className="inspector" aria-label="Propriedades">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "scene"} className={tab === "scene" ? "tab on" : "tab"} onClick={() => setTab("scene")}>
          {overlayPanel ? "Ilustração" : "Cena"}
        </button>
        <button role="tab" aria-selected={tab === "project"} className={tab === "project" ? "tab on" : "tab"} onClick={() => setTab("project")}>
          Projeto
        </button>
      </div>
      <div className="inspector-body">
        {tab === "project" ? (
          <ProjectFields
            project={project}
            onProject={onProject}
            onRepurposeForSocial={onRepurposeForSocial}
            flash={flash}
          />
        ) : overlayPanel ? (
          overlayPanel
        ) : scene ? (
          <>
            <div className="scene-head">
              <span className={`swatch t-${scene.type}`} />
              {SCENE_LABELS[scene.type]}
            </div>
            {scene.type === "video" ? (
              videoPanel
            ) : (
            <Field label="Duração (segundos)">
              <NumberText
                value={scene.duration / FPS}
                onChange={(n) =>
                  onScene(
                    { duration: Math.max(MIN_SCENE_FRAMES, Math.min(MAX_SCENE_FRAMES, Math.round(n * FPS))) },
                    "duration",
                  )
                }
              />
            </Field>
            )}
            {scene.type !== "video" ? (
              <>
                <div className="divider" />
                <SceneFields s={scene} onScene={onScene} />
              </>
            ) : null}

            <div className="divider" />
            <div className="group-title">Efeitos da cena</div>
            <EffectList
              effects={scene.effects ?? []}
              onChange={(next, key) => onScene({ effects: next } as Partial<Scene>, key)}
              empty="Nenhum. Escolha um efeito na biblioteca à esquerda."
            />

            <div className="group-title">Transição para a próxima cena</div>
            <TransitionEditor scene={scene} isLast={isLastScene} onScene={onScene} />
          </>
        ) : (
          <p className="empty">Selecione uma cena na linha do tempo para editar.</p>
        )}
      </div>
    </aside>
  );
};
