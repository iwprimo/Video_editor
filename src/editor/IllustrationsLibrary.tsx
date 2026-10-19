import React, { useMemo, useRef, useState } from "react";
import { Film } from "lucide-react";
import { IconSvg } from "../remotion/overlays";
import { ImageAsset, OVERLAYS, OverlayKind, STICKER_PRESETS } from "../remotion/types";
import { searchIcons } from "./iconSearch";

export const OVERLAY_MIME = "application/x-editor-overlay";
export type OverlayPayload = { kind: OverlayKind; props?: Record<string, unknown> };

type Tab = "motion" | "stickers" | "icons" | "images" | "broll" | "ai";

const MOTION: OverlayKind[] = ["lowerThird", "callout", "keyword", "counter", "barChart", "progress", "checklist", "cta"];

export type ImageProvider = "gemini" | "openai";
export type ImageKeys = { gemini: boolean; openai: boolean; preferred: ImageProvider };

const PROVIDERS: { id: ImageProvider; name: string; note: string }[] = [
  { id: "gemini", name: "Nano Banana", note: "Google Gemini" },
  { id: "openai", name: "GPT Image", note: "OpenAI" },
];

type Props = {
  assets: ImageAsset[];
  imageKeys: ImageKeys;
  generating: boolean;
  uploading: string | null;
  onAdd: (payload: OverlayPayload) => void;
  onUpload: (files: File[]) => void;
  onUploadBroll?: (files: File[]) => void;
  onGenerate: (prompt: string, aspect: "landscape" | "portrait" | "square", transparent: boolean, provider: ImageProvider) => void;
  onRemoveAsset: (id: string) => void;
  onOpenSettings: () => void;
};

const drag = (payload: OverlayPayload) => (e: React.DragEvent) => {
  e.dataTransfer.setData(OVERLAY_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "copy";
};

// Miniaturas estilizadas de cada motion graphic
const MotionThumb: React.FC<{ kind: OverlayKind }> = ({ kind }) => (
  <span className={`thumb mg mg-${kind}`} aria-hidden>
    {kind === "lowerThird" ? (
      <span className="mg-lt">
        <i />
        <span>
          <b />
          <em />
        </span>
      </span>
    ) : null}
    {kind === "callout" ? (
      <span className="mg-pill">
        <i />
        <b />
      </span>
    ) : null}
    {kind === "keyword" ? <span className="mg-word">UAU</span> : null}
    {kind === "counter" ? <span className="mg-num">98%</span> : null}
    {kind === "barChart" ? (
      <span className="mg-bars">
        <i />
        <i />
        <i />
      </span>
    ) : null}
    {kind === "progress" ? <span className="mg-ring" /> : null}
    {kind === "checklist" ? (
      <span className="mg-list">
        <i />
        <i />
        <i />
      </span>
    ) : null}
    {kind === "cta" ? <span className="mg-cta">Saiba mais →</span> : null}
  </span>
);

const StickerThumb: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const iconMap: Record<string, string> = {
    "arrow-down": "arrow-down",
    "arrow-right": "arrow-right",
    "arrow-curve": "corner-right-down",
    "circle-pulse": "circle-dot",
    "alert-warning": "alert-triangle",
    subscribe: "bell",
    verified: "check",
    "fire-trend": "flame",
    "tap-gesture": "pointer",
  };
  const icon = iconMap[type] ?? "sparkles";
  return (
    <span
      className="thumb"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 48,
        height: 48,
        borderRadius: 8,
        background: "rgba(255, 255, 255, 0.05)",
        color,
      }}
      aria-hidden
    >
      <IconSvg name={icon} size={24} strokeWidth={2.4} />
    </span>
  );
};

export const IllustrationsLibrary: React.FC<Props> = (p) => {
  const [tab, setTab] = useState<Tab>("motion");
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<"landscape" | "portrait" | "square">("landscape");
  const [transparent, setTransparent] = useState(false);
  const [chosen, setChosen] = useState<ImageProvider | null>(null);
  const keys = p.imageKeys;
  // Usa o que o usuário escolheu; senão o padrão das configurações; senão o que tiver chave
  const provider: ImageProvider = chosen ?? (keys[keys.preferred] ? keys.preferred : keys.gemini ? "gemini" : keys.openai ? "openai" : keys.preferred);
  const hasKey = keys[provider];
  const fileRef = useRef<HTMLInputElement>(null);
  const brollFileRef = useRef<HTMLInputElement>(null);
  const icons = useMemo(() => searchIcons(query, 120), [query]);

  return (
    <div className="lib-inner">
      <div className="lib-head">
        <div className="chips" role="tablist">
          {(
            [
              ["motion", "Motion"],
              ["stickers", "Stickers"],
              ["icons", "Ícones"],
              ["images", "Imagens"],
              ["broll", "B-Roll (Vídeos)"],
              ["ai", "Gerar com IA"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "chip on" : "chip"} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="lib-body">
        <p className="lib-hint">Clique para inserir no ponto do cursor, ou arraste até a faixa de ilustrações na linha do tempo.</p>

        {tab === "motion" ? (
          <div className="fx-grid">
            {MOTION.map((k) => (
              <div key={k} className="fx-card" draggable onDragStart={drag({ kind: k })} title={OVERLAYS[k].description}>
                <button className="fx-main" onClick={() => p.onAdd({ kind: k })} aria-label={`Inserir ${OVERLAYS[k].name}`}>
                  <MotionThumb kind={k} />
                  <span className="fx-name">{OVERLAYS[k].name}</span>
                  <span className="fx-desc">{OVERLAYS[k].description}</span>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "stickers" ? (
          <div className="fx-grid">
            {STICKER_PRESETS.map((st) => (
              <div
                key={st.id}
                className="fx-card"
                draggable
                onDragStart={drag({
                  kind: "sticker",
                  props: {
                    stickerType: st.id,
                    color: st.defaultColor,
                    text: st.defaultText,
                  },
                })}
                title={st.description}
              >
                <button
                  className="fx-main"
                  onClick={() =>
                    p.onAdd({
                      kind: "sticker",
                      props: {
                        stickerType: st.id,
                        color: st.defaultColor,
                        text: st.defaultText,
                      },
                    })
                  }
                  aria-label={`Inserir ${st.name}`}
                >
                  <StickerThumb type={st.id} color={st.defaultColor} />
                  <span className="fx-name">{st.name}</span>
                  <span className="fx-desc">{st.description}</span>
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "icons" ? (
          <>
            <input
              className="input search"
              type="search"
              placeholder="Buscar: fábrica, segurança, meta, tempo…"
              aria-label="Buscar ícone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {!icons.length ? <p className="empty">Nenhum ícone encontrado. Tente em inglês também.</p> : null}
            <div className="icon-grid">
              {icons.map((n) => (
                <button
                  key={n}
                  className="icon-btn"
                  draggable
                  onDragStart={drag({ kind: "icon", props: { name: n, label: "", color: "" } })}
                  onClick={() => p.onAdd({ kind: "icon", props: { name: n, label: "", color: "" } })}
                  title={n}
                  aria-label={`Inserir ícone ${n}`}
                >
                  <IconSvg name={n} size={22} />
                </button>
              ))}
            </div>
            <p className="field-hint">Ícones Lucide (licença livre ISC).</p>
          </>
        ) : null}

        {tab === "images" ? (
          <>
            <button className="btn wide" onClick={() => fileRef.current?.click()} disabled={!!p.uploading}>
              {p.uploading ?? "Enviar imagens ou logos"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) p.onUpload(files);
                e.target.value = "";
              }}
            />
            {!p.assets.filter((a) => a.kind !== "video").length ? <p className="empty">Nenhuma imagem ainda. PNG com fundo transparente funciona bem para logos.</p> : null}
            <div className="asset-grid big">
              {p.assets
                .filter((a) => a.kind !== "video")
                .map((a) => (
                  <div key={a.id} className="asset-card">
                    <button
                      className="asset"
                      draggable
                      onDragStart={drag({ kind: "image", props: { assetId: a.id } })}
                      onClick={() => p.onAdd({ kind: "image", props: { assetId: a.id } })}
                      title={a.prompt ?? a.name}
                      aria-label={`Inserir ${a.name}`}
                    >
                      <img src={`/media/${a.file}`} alt={a.name} />
                      {a.generated ? <span className="asset-tag">{a.provider === "gemini" ? "Nano Banana" : a.provider === "openai" ? "GPT" : "IA"}</span> : null}
                    </button>
                    <button className="asset-del" onClick={() => p.onRemoveAsset(a.id)} aria-label={`Remover ${a.name}`} title="Remover da biblioteca">
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </>
        ) : null}

        {tab === "broll" ? (
          <>
            <button className="btn wide" onClick={() => brollFileRef.current?.click()} disabled={!!p.uploading}>
              {p.uploading ?? "Enviar vídeos B-Roll (MP4/MOV)"}
            </button>
            <input
              ref={brollFileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) p.onUploadBroll ? p.onUploadBroll(files) : p.onUpload(files);
                e.target.value = "";
              }}
            />
            {!p.assets.filter((a) => a.kind === "video").length ? (
              <p className="empty">Nenhum vídeo B-Roll ainda. Envie clipes curtos de apoio para sobrepor na fala.</p>
            ) : null}
            <div className="asset-grid big">
              {p.assets
                .filter((a) => a.kind === "video")
                .map((a) => (
                  <div key={a.id} className="asset-card">
                    <button
                      className="asset"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#161926",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        padding: 8,
                        gap: 6,
                        textAlign: "center",
                      }}
                      draggable
                      onDragStart={drag({ kind: "video", props: { assetId: a.id, fit: "cover", rounded: false, volume: 0 } })}
                      onClick={() => p.onAdd({ kind: "video", props: { assetId: a.id, fit: "cover", rounded: false, volume: 0 } })}
                      title={a.name}
                      aria-label={`Inserir B-Roll ${a.name}`}
                    >
                      <Film size={24} color="#ffd84d" />
                      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink, #fff)", lineHeight: 1.2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.name}
                      </span>
                    </button>
                    <button className="asset-del" onClick={() => p.onRemoveAsset(a.id)} aria-label={`Remover ${a.name}`} title="Remover da biblioteca">
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </>
        ) : null}

        {tab === "ai" ? (
          <div className="lib-stack">
            <div className="field">
              <span className="field-label">Gerador</span>
              <div className="provider-pick" role="radiogroup" aria-label="Gerador de imagem">
                {PROVIDERS.map((pv) => (
                  <button
                    key={pv.id}
                    role="radio"
                    aria-checked={provider === pv.id}
                    className={provider === pv.id ? "provider on" : "provider"}
                    onClick={() => setChosen(pv.id)}
                  >
                    <span className="provider-name">{pv.name}</span>
                    <span className="provider-note">{keys[pv.id] ? pv.note : "sem chave"}</span>
                  </button>
                ))}
              </div>
            </div>
            {!hasKey ? (
              <div className="callout-box">
                <span>
                  {provider === "gemini"
                    ? "Para gerar com o Nano Banana, configure a chave da API do Gemini."
                    : "Para gerar com o GPT Image, configure a chave da OpenAI."}
                </span>
                <button className="btn" onClick={p.onOpenSettings}>
                  Configurações
                </button>
              </div>
            ) : null}
            <label className="field">
              <span className="field-label">Descreva a ilustração</span>
              <textarea
                className="input area"
                rows={5}
                placeholder="Ex.: ilustração flat de uma bobina de papel gigante saindo de uma máquina, tons de verde"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Formato</span>
                <select className="input" value={aspect} onChange={(e) => setAspect(e.target.value as typeof aspect)}>
                  <option value="landscape">Horizontal</option>
                  <option value="portrait">Vertical</option>
                  <option value="square">Quadrado</option>
                </select>
              </label>
              <label className="toggle tight">
                <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
                <span>{provider === "gemini" ? "Fundo liso" : "Fundo transparente"}</span>
              </label>
            </div>
            <button
              className="btn primary wide"
              disabled={!prompt.trim() || p.generating || !hasKey}
              onClick={() => p.onGenerate(prompt.trim(), aspect, transparent, provider)}
            >
              {p.generating ? "Gerando… (pode levar até 1 minuto)" : `Gerar com ${provider === "gemini" ? "Nano Banana" : "GPT Image"}`}
            </button>
            <p className="field-hint">
              A imagem é inserida no ponto do cursor e fica salva em Imagens para reutilizar. Cada geração tem custo na sua conta
              {provider === "gemini" ? " do Google; as imagens do Gemini levam a marca d’água invisível SynthID." : " da OpenAI."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
