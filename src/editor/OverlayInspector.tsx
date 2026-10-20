import React, { useMemo, useState } from "react";
import { Volume2, Film } from "lucide-react";
import { IconSvg } from "../remotion/overlays";
import {
  FPS,
  OVERLAYS,
  Overlay,
  OverlayPosition,
  POSITIONS,
  Project,
  STICKER_PRESETS,
  localToSource,
  sourceToLocal,
} from "../remotion/types";
import { parseNumber } from "./Inspector";
import { searchIcons } from "./iconSearch";
import { playSfxPreview } from "../remotion/sfx";

type Props = {
  overlay: Overlay;
  project: Project;
  onChange: (patch: Partial<Overlay>, mergeKey?: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

const GRID: (OverlayPosition | null)[] = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint ? <span className="field-hint">{hint}</span> : null}
  </label>
);

const NumInput: React.FC<{ value: number; onChange: (n: number) => void; step?: number }> = ({ value, onChange }) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      className="input"
      inputMode="decimal"
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

export const OverlayInspector: React.FC<Props> = ({ overlay: ov, project, onChange, onDelete, onDuplicate }) => {
  const meta = OVERLAYS[ov.kind];
  const scene = project.scenes.find((s) => s.id === ov.sceneId);
  const [iconQuery, setIconQuery] = useState("");
  const icons = useMemo(() => searchIcons(iconQuery, 48), [iconQuery]);

  // Início mostrado em segundos dentro da cena já editada
  const local = scene?.type === "video" ? sourceToLocal(scene.segments, ov.at) ?? 0 : ov.at;
  const setLocal = (l: number) => {
    const max = scene ? scene.duration / FPS - 0.1 : l;
    const v = Math.max(0, Math.min(max, l));
    onChange({ at: scene?.type === "video" ? localToSource(scene.segments, v) : v }, "at");
  };
  const prop = (k: string, v: unknown, key?: string) => onChange({ props: { ...ov.props, [k]: v } }, key ?? `p-${k}`);
  const p = ov.props as Record<string, any>;

  return (
    <>
      <div className="scene-head">
        <span className="swatch t-overlay" />
        {meta.name}
        <span className="grow" />
        <button className="btn ghost sm-text" onClick={onDuplicate}>
          Duplicar
        </button>
        <button className="btn ghost danger sm-text" onClick={onDelete}>
          Excluir
        </button>
      </div>
      <p className="field-hint">
        Na cena “{scene ? (scene.type === "video" ? scene.name : scene.type) : "?"}”. Arraste o bloco na faixa de ilustrações para mudar o momento.
      </p>

      <div className="grid-2">
        <Field label="Início na cena (s)">
          <NumInput value={Math.round(local * 10) / 10} onChange={setLocal} />
        </Field>
        <Field label="Duração (s)">
          <NumInput value={ov.duration} onChange={(n) => onChange({ duration: Math.max(0.5, Math.min(60, n)) }, "dur")} />
        </Field>
      </div>

      <div className="field">
        <span className="field-label">Posição</span>
        <div className="pos-picker">
          <div className="pos-grid" role="radiogroup" aria-label="Posição">
            {GRID.map((g) => (
              <button
                key={g}
                role="radio"
                aria-checked={ov.position === g}
                aria-label={g ? POSITIONS[g] : ""}
                title={g ? POSITIONS[g] : ""}
                className={ov.position === g ? "pos on" : "pos"}
                onClick={() => g && onChange({ position: g })}
              />
            ))}
          </div>
          {ov.kind === "image" || ov.kind === "video" ? (
            <button className={ov.position === "full" ? "btn sm-text on-outline" : "btn ghost sm-text"} onClick={() => onChange({ position: ov.position === "full" ? "center" : "full" })}>
              Tela cheia
            </button>
          ) : null}
        </div>
      </div>

      {ov.position !== "full" ? (
        <label className="field">
          <span className="field-label">Tamanho</span>
          <span className="slider">
            <input type="range" min={0.15} max={1} step={0.01} value={ov.size} onChange={(e) => onChange({ size: Number(e.target.value) }, "size")} />
            <span className="slider-val">{Math.round(ov.size * 100)}%</span>
          </span>
        </label>
      ) : null}

      <div className="grid-2">
        <Field label="Efeito Sonoro (SFX)" hint="Toca ao surgir no vídeo">
          <select
            className="input"
            value={ov.sfx ?? "pop"}
            onChange={(e) => {
              const val = e.target.value as any;
              onChange({ sfx: val });
              if (val !== "none") playSfxPreview(val);
            }}
          >
            <option value="none">Nenhum</option>
            <option value="pop">Pop (Bolha/Destaque)</option>
            <option value="whoosh">Whoosh (Deslize)</option>
            <option value="ding">Ding (Sino/Conquista)</option>
            <option value="click">Click (Toque seco)</option>
            <option value="shutter">Camera Shutter (Foto)</option>
          </select>
        </Field>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
          <button
            type="button"
            className="btn ghost sm wide"
            disabled={!ov.sfx || ov.sfx === "none"}
            onClick={() => playSfxPreview(ov.sfx ?? "pop")}
            title="Ouvir prévia do som"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            <Volume2 size={13} style={{ marginRight: 4 }} />
            Ouvir
          </button>
        </div>
      </div>

      <Field label="Animação de Entrada / Movimento">
        <select
          className="input"
          value={p.animation ?? "pop"}
          onChange={(e) => prop("animation", e.target.value)}
        >
          <option value="pop">Pop com Salto (Viral)</option>
          <option value="slam">Impact Slam (Queda com Impacto)</option>
          <option value="slideUp">Subida Elástica</option>
          <option value="slideLeft">Deslize da Esquerda</option>
          <option value="slideRight">Deslize da Direita</option>
          <option value="glitch">Glitch Cyberpunk</option>
          <option value="float">Flutuação Contínua (Levitação)</option>
          <option value="pulse">Pulso de Atenção</option>
          <option value="fade">Aparecer Suave (Fade)</option>
        </select>
      </Field>

      <div className="divider" />

      {ov.kind === "image" ? (
        <>
          <div className="group-title">Imagem</div>
          {(project.assets ?? []).length ? (
            <div className="asset-grid">
              {(project.assets ?? []).map((a) => (
                <button key={a.id} className={p.assetId === a.id ? "asset on" : "asset"} onClick={() => prop("assetId", a.id)} title={a.name}>
                  <img src={`/media/${a.file}`} alt={a.name} />
                </button>
              ))}
            </div>
          ) : (
            <p className="field-hint">Envie imagens na biblioteca, aba Ilustrações › Imagens.</p>
          )}
          <Field label="Animação">
            <select className="input" value={p.animation ?? "pop"} onChange={(e) => prop("animation", e.target.value)}>
              <option value="pop">Surgir</option>
              <option value="fade">Aparecer suave</option>
              <option value="slide">Deslizar</option>
              <option value="zoom">Zoom lento</option>
            </select>
          </Field>
          <label className="toggle">
            <input type="checkbox" checked={p.rounded !== false} onChange={(e) => prop("rounded", e.target.checked)} />
            <span>Cantos arredondados</span>
          </label>
        </>
      ) : null}

      {ov.kind === "video" ? (
        <>
          <div className="group-title">Vídeo B-Roll (Corte de Apoio)</div>
          {(project.assets ?? []).some((a) => a.kind === "video" || !a.kind) ? (
            <div className="asset-grid">
              {(project.assets ?? [])
                .filter((a) => a.kind === "video" || !a.kind)
                .map((a) => (
                  <button
                    key={a.id}
                    className={p.assetId === a.id ? "asset on" : "asset"}
                    onClick={() => prop("assetId", a.id)}
                    title={a.name}
                  >
                    {a.kind === "video" ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#1a1d2e",
                          color: "#ffd84d",
                          fontSize: 10,
                          padding: 4,
                          textAlign: "center",
                          wordBreak: "break-all",
                        }}
                      >
                        <Film size={20} color="#ffd84d" style={{ marginBottom: 4 }} />
                        <span style={{ lineHeight: 1.1, color: "#eef0f7" }}>{a.name}</span>
                      </div>
                    ) : (
                      <img src={`/media/${a.file}`} alt={a.name} />
                    )}
                  </button>
                ))}
            </div>
          ) : (
            <p className="field-hint">Envie vídeos B-Roll na biblioteca, aba Ilustrações › B-Roll.</p>
          )}

          <div className="grid-2">
            <Field label="Enquadramento">
              <select
                className="input"
                value={p.fit ?? "cover"}
                onChange={(e) => prop("fit", e.target.value)}
              >
                <option value="cover">Preencher (Cover)</option>
                <option value="contain">Ajustar (Contain)</option>
              </select>
            </Field>

            <label className="field">
              <span className="field-label">Volume do Clipe</span>
              <span className="slider">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={p.volume ?? 0}
                  onChange={(e) => prop("volume", Number(e.target.value), "broll-vol")}
                />
                <span className="slider-val">{Math.round((p.volume ?? 0) * 100)}%</span>
              </span>
            </label>
          </div>

          {ov.position !== "full" ? (
            <label className="toggle">
              <input
                type="checkbox"
                checked={p.rounded !== false}
                onChange={(e) => prop("rounded", e.target.checked)}
              />
              <span>Cantos arredondados</span>
            </label>
          ) : null}
        </>
      ) : null}

      {ov.kind === "sticker" ? (
        <>
          <div className="group-title">Sticker Animado</div>
          <Field label="Modelo do Sticker">
            <select
              className="input"
              value={String(p.stickerType ?? "arrow-down")}
              onChange={(e) => {
                const found = STICKER_PRESETS.find((s) => s.id === e.target.value);
                prop("stickerType", e.target.value);
                if (found && !p.text) prop("text", found.defaultText);
                if (found && !p.color) prop("color", found.defaultColor);
              }}
            >
              {STICKER_PRESETS.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Texto / Rótulo (Opcional)">
            <input
              type="text"
              className="input"
              value={String(p.text ?? "")}
              placeholder="Ex: OLHE AQUI, ATENÇÃO, SEGUIR"
              onChange={(e) => prop("text", e.target.value)}
            />
          </Field>

          <div className="grid-2">
            <label className="color-field">
              <input
                type="color"
                value={String(p.color ?? project.theme.accent)}
                onChange={(e) => prop("color", e.target.value)}
              />
              <span className="field-label">Cor Principal</span>
              <code>{String(p.color ?? project.theme.accent)}</code>
            </label>

            <Field label="Animação Contínua">
              <select
                className="input"
                value={String(p.animation ?? "bounce")}
                onChange={(e) => prop("animation", e.target.value)}
              >
                <option value="bounce">Pulsar & Pular (Atenção)</option>
                <option value="pop">Entrada Pop Fixa</option>
              </select>
            </Field>
          </div>
        </>
      ) : null}

      {ov.kind === "icon" ? (
        <>
          <Field label="Legenda" hint="Opcional">
            <input className="input" value={p.label ?? ""} onChange={(e) => prop("label", e.target.value)} />
          </Field>
          <label className="color-field">
            <input type="color" value={p.color || project.theme.accent} onChange={(e) => prop("color", e.target.value, "color")} />
            <span>Cor do círculo</span>
            {p.color ? (
              <button className="link" onClick={() => prop("color", "")}>
                usar destaque
              </button>
            ) : (
              <code>tema</code>
            )}
          </label>
          <Field label="Ícone">
            <input className="input" placeholder="Buscar: fábrica, segurança, meta…" value={iconQuery} onChange={(e) => setIconQuery(e.target.value)} />
          </Field>
          <div className="icon-grid small">
            {icons.map((n) => (
              <button key={n} className={p.name === n ? "icon-btn on" : "icon-btn"} onClick={() => prop("name", n)} title={n} aria-label={n}>
                <IconSvg name={n} size={20} />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {ov.kind === "lowerThird" ? (
        <>
          <Field label="Nome">
            <input className="input" value={p.title ?? ""} onChange={(e) => prop("title", e.target.value)} />
          </Field>
          <Field label="Cargo ou descrição">
            <input className="input" value={p.subtitle ?? ""} onChange={(e) => prop("subtitle", e.target.value)} />
          </Field>
        </>
      ) : null}

      {ov.kind === "callout" || ov.kind === "keyword" || ov.kind === "cta" ? (
        <Field label="Texto">
          <input className="input" value={p.text ?? ""} onChange={(e) => prop("text", e.target.value)} />
        </Field>
      ) : null}

      {ov.kind === "counter" ? (
        <>
          <div className="grid-3">
            <Field label="Valor">
              <NumInput value={Number(p.value ?? 0)} onChange={(n) => prop("value", n)} />
            </Field>
            <Field label="Prefixo">
              <input className="input" value={p.prefix ?? ""} onChange={(e) => prop("prefix", e.target.value)} />
            </Field>
            <Field label="Sufixo">
              <input className="input" value={p.suffix ?? ""} onChange={(e) => prop("suffix", e.target.value)} />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Casas decimais">
              <select className="input" value={p.decimals ?? 0} onChange={(e) => prop("decimals", Number(e.target.value))}>
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </Field>
            <Field label="Legenda">
              <input className="input" value={p.label ?? ""} onChange={(e) => prop("label", e.target.value)} />
            </Field>
          </div>
        </>
      ) : null}

      {ov.kind === "progress" ? (
        <div className="grid-2">
          <Field label="Porcentagem">
            <NumInput value={Number(p.value ?? 0)} onChange={(n) => prop("value", Math.max(0, Math.min(100, n)))} />
          </Field>
          <Field label="Legenda">
            <input className="input" value={p.label ?? ""} onChange={(e) => prop("label", e.target.value)} />
          </Field>
        </div>
      ) : null}

      {ov.kind === "barChart" ? (
        <>
          <Field label="Título">
            <input className="input" value={p.title ?? ""} onChange={(e) => prop("title", e.target.value)} />
          </Field>
          <div className="rows">
            {((p.data ?? []) as { label: string; value: number }[]).map((d, i, arr) => (
              <div className="row" key={i}>
                <input className="input" aria-label={`Rótulo ${i + 1}`} value={d.label} onChange={(e) => prop("data", arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)), `d-l-${i}`)} />
                <NumInput value={Number(d.value)} onChange={(n) => prop("data", arr.map((x, j) => (j === i ? { ...x, value: n } : x)), `d-v-${i}`)} />
                <button className="btn icon ghost" aria-label="Remover" disabled={arr.length <= 1} onClick={() => prop("data", arr.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="btn ghost wide" disabled={(p.data ?? []).length >= 8} onClick={() => prop("data", [...(p.data ?? []), { label: "Novo", value: 50 }])}>
            + Barra
          </button>
        </>
      ) : null}

      {ov.kind === "checklist" ? (
        <>
          <Field label="Título">
            <input className="input" value={p.title ?? ""} onChange={(e) => prop("title", e.target.value)} />
          </Field>
          <Field label="Itens" hint="Um por linha">
            <textarea
              className="input area"
              rows={5}
              value={((p.items ?? []) as string[]).join("\n")}
              onChange={(e) => prop("items", e.target.value.split("\n").slice(0, 8), "items")}
            />
          </Field>
        </>
      ) : null}

      {ov.kind === "hookPunch" ? (
        <>
          <div className="group-title">Gancho de Impacto</div>
          <Field label="Texto do Gancho">
            <input className="input" value={p.text ?? ""} onChange={(e) => prop("text", e.target.value)} />
          </Field>
          <div className="grid-2">
            <Field label="Badge / Etiqueta">
              <input className="input" value={p.badge ?? ""} onChange={(e) => prop("badge", e.target.value)} />
            </Field>
            <Field label="Cor de Destaque">
              <input type="color" className="input color-input" value={p.color ?? "#ef4444"} onChange={(e) => prop("color", e.target.value)} />
            </Field>
          </div>
        </>
      ) : null}

      {ov.kind === "socialQuote" ? (
        <>
          <div className="group-title">Card de Post / Seguidor</div>
          <div className="grid-2">
            <Field label="Autor (@)">
              <input className="input" value={p.author ?? ""} onChange={(e) => prop("author", e.target.value)} />
            </Field>
            <Field label="Badge / Rótulo">
              <input className="input" value={p.badge ?? ""} onChange={(e) => prop("badge", e.target.value)} />
            </Field>
          </div>
          <Field label="Pergunta / Texto">
            <textarea
              className="input area"
              rows={3}
              value={p.text ?? ""}
              onChange={(e) => prop("text", e.target.value)}
            />
          </Field>
          <div className="grid-2">
            <Field label="Curtidas">
              <input className="input" value={p.likes ?? "14.2k"} onChange={(e) => prop("likes", e.target.value)} />
            </Field>
            <label className="toggle" style={{ alignSelf: "center", marginTop: 16 }}>
              <input type="checkbox" checked={p.verified !== false} onChange={(e) => prop("verified", e.target.checked)} />
              <span>Selo Verificado</span>
            </label>
          </div>
        </>
      ) : null}

      {ov.kind === "soundwave" ? (
        <>
          <div className="group-title">Mensagem de Voz / Áudio</div>
          <Field label="Remetente / Título">
            <input className="input" value={p.sender ?? ""} onChange={(e) => prop("sender", e.target.value)} />
          </Field>
          <div className="grid-2">
            <Field label="Tempo">
              <input className="input" value={p.time ?? "0:15"} onChange={(e) => prop("time", e.target.value)} />
            </Field>
            <Field label="Cor">
              <input type="color" className="input color-input" value={p.color ?? "#22c55e"} onChange={(e) => prop("color", e.target.value)} />
            </Field>
          </div>
        </>
      ) : null}

      {ov.kind === "versus" ? (
        <>
          <div className="group-title">Comparativo Certo vs Errado</div>
          <Field label="Título Geral">
            <input className="input" value={p.title ?? ""} onChange={(e) => prop("title", e.target.value)} />
          </Field>
          <div className="grid-2">
            <Field label="Badge Lado 1">
              <input className="input" value={p.leftBadge ?? "ERRADO"} onChange={(e) => prop("leftBadge", e.target.value)} />
            </Field>
            <Field label="Badge Lado 2">
              <input className="input" value={p.rightBadge ?? "CERTO"} onChange={(e) => prop("rightBadge", e.target.value)} />
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Texto Lado 1 (Errado/Antes)">
              <textarea className="input area" rows={2} value={p.leftText ?? ""} onChange={(e) => prop("leftText", e.target.value)} />
            </Field>
            <Field label="Texto Lado 2 (Certo/Depois)">
              <textarea className="input area" rows={2} value={p.rightText ?? ""} onChange={(e) => prop("rightText", e.target.value)} />
            </Field>
          </div>
        </>
      ) : null}
    </>
  );
};
