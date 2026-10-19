import React, { useMemo, useState } from "react";
import {
  EFFECTS,
  EFFECT_CATEGORIES,
  EffectCategory,
  EffectType,
  TRANSITIONS,
  TransitionType,
} from "../remotion/types";

export type FxPayload = { kind: "effect"; type: EffectType } | { kind: "transition"; type: TransitionType };
export const FX_MIME = "application/x-editor-fx";

type Tab = "transition" | EffectCategory;

const TABS: { id: Tab; label: string }[] = [
  { id: "transition", label: "Transições" },
  { id: "camera", label: EFFECT_CATEGORIES.camera },
  { id: "color", label: EFFECT_CATEGORIES.color },
  { id: "overlay", label: EFFECT_CATEGORIES.overlay },
];

type Props = {
  hasScene: boolean;
  isLastScene: boolean;
  onApply: (fx: FxPayload, target: "scene" | "global") => void;
  onHover: (fx: FxPayload | null) => void;
};

// Miniatura animada em CSS que mostra o efeito em ação
const Thumb: React.FC<{ fx: FxPayload }> = ({ fx }) =>
  fx.kind === "transition" ? (
    <span className={`thumb tr tr-${fx.type}`} aria-hidden>
      <span className="pa">
        <i />
        <i />
      </span>
      <span className="pb">
        <i />
        <i />
      </span>
      <span className="fl" />
    </span>
  ) : (
    <span className={`thumb fx fx-${fx.type}`} aria-hidden>
      <span className="mini">
        <b />
        <span className="bars">
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className="ov" />
      <span className="ov2" />
    </span>
  );

export const EffectsLibrary: React.FC<Props> = ({ hasScene, isLastScene, onApply, onHover }) => {
  const [tab, setTab] = useState<Tab>("transition");
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (name: string, desc: string) => !q || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
    const transitions = (Object.keys(TRANSITIONS) as TransitionType[])
      .filter((t) => (q ? true : tab === "transition"))
      .filter((t) => match(TRANSITIONS[t].name, TRANSITIONS[t].description))
      .map((t) => ({
        fx: { kind: "transition", type: t } as FxPayload,
        name: TRANSITIONS[t].name,
        description: TRANSITIONS[t].description,
        global: false,
      }));
    const effects = (Object.keys(EFFECTS) as EffectType[])
      .filter((e) => (q ? true : EFFECTS[e].category === tab))
      .filter((e) => match(EFFECTS[e].name, EFFECTS[e].description))
      .map((e) => ({
        fx: { kind: "effect", type: e } as FxPayload,
        name: EFFECTS[e].name,
        description: EFFECTS[e].description,
        global: EFFECTS[e].global,
      }));
    return [...transitions, ...effects];
  }, [tab, query]);

  const hint =
    tab === "transition" && !query
      ? isLastScene
        ? "Selecione uma cena que não seja a última: a transição liga a cena à próxima."
        : "Clique para aplicar entre a cena selecionada e a próxima, ou arraste até um bloco da linha do tempo."
      : "Clique para aplicar na cena selecionada, ou arraste até um bloco da linha do tempo.";

  return (
    <div className="lib-inner">
      <div className="lib-head">
        <input
          className="input search"
          type="search"
          placeholder="Buscar efeito"
          aria-label="Buscar efeito"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={!query && tab === t.id}
              className={!query && tab === t.id ? "chip on" : "chip"}
              onClick={() => {
                setTab(t.id);
                setQuery("");
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lib-body">
        <p className="lib-hint">{hint}</p>
        {items.length === 0 ? <p className="empty">Nenhum efeito encontrado.</p> : null}
        <div className="fx-grid">
          {items.map((it) => {
            const disabled = !hasScene || (it.fx.kind === "transition" && isLastScene);
            return (
              <div
                key={`${it.fx.kind}-${it.fx.type}`}
                className={`fx-card${disabled ? " disabled" : ""}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(FX_MIME, JSON.stringify(it.fx));
                  e.dataTransfer.effectAllowed = "copy";
                  onHover(null);
                }}
                onMouseEnter={() => !disabled && onHover(it.fx)}
                onMouseLeave={() => onHover(null)}
                title={it.description}
              >
                <button
                  className="fx-main"
                  disabled={disabled}
                  onClick={() => onApply(it.fx, "scene")}
                  aria-label={`Aplicar ${it.name}`}
                >
                  <Thumb fx={it.fx} />
                  <span className="fx-name">{it.name}</span>
                  <span className="fx-desc">{it.description}</span>
                </button>
                {it.global ? (
                  <button
                    className="fx-global"
                    onClick={() => onApply(it.fx, "global")}
                    title="Aplicar no vídeo inteiro"
                    aria-label={`Aplicar ${it.name} no vídeo inteiro`}
                  >
                    Vídeo todo
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
