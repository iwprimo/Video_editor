import React, { useMemo, useRef, useState } from "react";
import { Film, Search, Sparkles, Download, Check, RefreshCw, ExternalLink, Plus, Clock } from "lucide-react";
import { IconSvg } from "../remotion/overlays";
import { ImageAsset, OVERLAYS, OverlayKind, STICKER_PRESETS, Word } from "../remotion/types";
import { searchIcons } from "./iconSearch";
import { getJson, postJson } from "./api";

export const OVERLAY_MIME = "application/x-editor-overlay";
export type OverlayPayload = { kind: OverlayKind; props?: Record<string, unknown> };

type Tab = "motion" | "stickers" | "icons" | "images" | "broll" | "ai";

const MOTION: OverlayKind[] = [
  "hookPunch",
  "socialQuote",
  "versus",
  "soundwave",
  "keyword",
  "callout",
  "lowerThird",
  "counter",
  "progress",
  "barChart",
  "checklist",
  "cta",
];

export type ImageProvider = "gemini" | "openai";
export type ImageKeys = { gemini: boolean; openai: boolean; preferred: ImageProvider };

const PROVIDERS: { id: ImageProvider; name: string; note: string }[] = [
  { id: "gemini", name: "Nano Banana", note: "Google Gemini" },
  { id: "openai", name: "GPT Image", note: "OpenAI" },
];

export type PexelsVideo = {
  id: number | string;
  width: number;
  height: number;
  duration: number;
  image: string;
  user?: { name: string; url: string };
  videoUrl?: string;
};

export type BrollSuggestion = {
  keyword: string;
  englishKeyword: string;
  start: number;
  end: number;
  reason: string;
};

type Props = {
  assets: ImageAsset[];
  imageKeys: ImageKeys;
  generating: boolean;
  uploading: string | null;
  words?: Word[];
  onAdd: (payload: OverlayPayload) => void;
  onAddAsset?: (asset: ImageAsset) => void;
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
    {kind === "hookPunch" ? (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <span style={{ background: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 900, padding: "1px 5px", borderRadius: 4 }}>ALERTA</span>
        <b style={{ fontSize: 9, color: "#fff", textTransform: "uppercase" }}>GANCHO</b>
      </span>
    ) : null}
    {kind === "socialQuote" ? (
      <span style={{ display: "flex", flexDirection: "column", gap: 2, padding: "3px 6px", width: "100%", background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", display: "inline-block" }} />
          <b style={{ fontSize: 8, color: "#cbd5e1" }}>@post</b>
        </span>
        <em style={{ fontSize: 7, color: "#94a3b8", fontStyle: "normal" }}>Pergunta...</em>
      </span>
    ) : null}
    {kind === "soundwave" ? (
      <span style={{ display: "flex", alignItems: "center", gap: 3, height: 16 }}>
        <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
        <span style={{ display: "flex", alignItems: "center", gap: 1 }}>
          <i style={{ width: 2, height: 6, background: "#22c55e", borderRadius: 1 }} />
          <i style={{ width: 2, height: 12, background: "#22c55e", borderRadius: 1 }} />
          <i style={{ width: 2, height: 8, background: "#22c55e", borderRadius: 1 }} />
          <i style={{ width: 2, height: 14, background: "#22c55e", borderRadius: 1 }} />
          <i style={{ width: 2, height: 7, background: "#22c55e", borderRadius: 1 }} />
        </span>
      </span>
    ) : null}
    {kind === "versus" ? (
      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 8, fontWeight: 800 }}>
        <span style={{ color: "#ef4444" }}>ERRADO</span>
        <span style={{ color: "#64748b" }}>vs</span>
        <span style={{ color: "#22c55e" }}>CERTO</span>
      </span>
    ) : null}
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

  // Sub-abas de B-Roll
  const [brollSubTab, setBrollSubTab] = useState<"library" | "pexels" | "auto">("library");
  const [pexelsQuery, setPexelsQuery] = useState("");
  const [pexelsOrientation, setPexelsOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pexelsVideos, setPexelsVideos] = useState<PexelsVideo[]>([]);
  const [pexelsLoading, setPexelsLoading] = useState(false);
  const [pexelsError, setPexelsError] = useState<string | null>(null);
  const [pexelsNeedsKey, setPexelsNeedsKey] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);

  const [brollSuggestions, setBrollSuggestions] = useState<BrollSuggestion[] | null>(null);
  const [suggestingBroll, setSuggestingBroll] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const handleSearchPexels = async (term?: string) => {
    const q = (term !== undefined ? term : pexelsQuery).trim();
    setPexelsLoading(true);
    setPexelsError(null);
    try {
      const url = `/api/pexels/search?query=${encodeURIComponent(q || "nature")}&orientation=${pexelsOrientation}&perPage=12`;
      const res = await getJson<{ needsKey: boolean; videos: PexelsVideo[]; message?: string }>(url);
      setPexelsVideos(res.videos || []);
      setPexelsNeedsKey(!!res.needsKey);
      if (res.message) setPexelsError(res.message);
    } catch (e) {
      setPexelsError(e instanceof Error ? e.message : "Erro ao pesquisar vídeos no Pexels.");
    } finally {
      setPexelsLoading(false);
    }
  };

  const handleDownloadPexels = async (video: PexelsVideo) => {
    if (!video.videoUrl) return;
    setDownloadingId(video.id);
    try {
      const asset = await postJson<ImageAsset>("/api/pexels/download", {
        videoUrl: video.videoUrl,
        id: String(video.id),
        name: `Pexels - ${video.id}`,
      });
      p.onAddAsset?.(asset);
      p.onAdd({ kind: "video", props: { assetId: asset.id, fit: "cover", rounded: false, volume: 0 } });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Falha ao baixar vídeo do Pexels.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSuggestBroll = async () => {
    if (!p.words?.length) {
      setSuggestError("Não há palavras transcritas no vídeo atual. Gere a transcrição primeiro.");
      return;
    }
    setSuggestingBroll(true);
    setSuggestError(null);
    try {
      const res = await postJson<{ suggestions: BrollSuggestion[] }>("/api/broll/suggest", {
        words: p.words,
        title: "Vídeo",
      });
      setBrollSuggestions(res.suggestions || []);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Erro ao sugerir B-Roll com IA.");
    } finally {
      setSuggestingBroll(false);
    }
  };

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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 6, background: "rgba(255, 255, 255, 0.04)", padding: 4, borderRadius: 8 }}>
              {(
                [
                  ["library", `Meus Clipes (${p.assets.filter((a) => a.kind === "video").length})`],
                  ["pexels", "Buscar Pexels"],
                  ["auto", "Sugestões de IA"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setBrollSubTab(id);
                    if (id === "pexels" && !pexelsVideos.length) handleSearchPexels("nature");
                    if (id === "auto" && !brollSuggestions && p.words?.length) handleSuggestBroll();
                  }}
                  style={{
                    flex: 1,
                    background: brollSubTab === id ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    color: brollSubTab === id ? "#fff" : "var(--muted, #94a3b8)",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: brollSubTab === id ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Sub-tab 1: Meus Clipes */}
            {brollSubTab === "library" && (
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
                  <p className="empty">Nenhum vídeo B-Roll ainda. Envie clipes curtos de apoio ou baixe do Pexels.</p>
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
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: "var(--ink, #fff)",
                              lineHeight: 1.2,
                              maxWidth: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {a.name}
                          </span>
                        </button>
                        <button
                          className="asset-del"
                          onClick={() => p.onRemoveAsset(a.id)}
                          aria-label={`Remover ${a.name}`}
                          title="Remover da biblioteca"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* Sub-tab 2: Pexels Search */}
            {brollSubTab === "pexels" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Search Bar */}
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="input"
                    type="search"
                    style={{ flex: 1, height: 34, fontSize: 12 }}
                    placeholder="Buscar no Pexels: tecnologia, cidade, café..."
                    value={pexelsQuery}
                    onChange={(e) => setPexelsQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchPexels()}
                  />
                  <button
                    className="btn primary"
                    style={{ height: 34, padding: "0 10px", display: "flex", alignItems: "center" }}
                    onClick={() => handleSearchPexels()}
                    disabled={pexelsLoading}
                    aria-label="Buscar"
                  >
                    {pexelsLoading ? <RefreshCw size={14} className="spin" /> : <Search size={14} />}
                  </button>
                </div>

                {/* Filters & Tags */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["portrait", "landscape"] as const).map((orient) => (
                      <button
                        key={orient}
                        style={{
                          background: pexelsOrientation === orient ? "rgba(255, 255, 255, 0.14)" : "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          color: pexelsOrientation === orient ? "#fff" : "var(--muted, #94a3b8)",
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          setPexelsOrientation(orient);
                          setTimeout(() => handleSearchPexels(), 50);
                        }}
                      >
                        {orient === "portrait" ? "9:16 Vertical" : "16:9 Horizontal"}
                      </button>
                    ))}
                  </div>

                  {pexelsNeedsKey && (
                    <button
                      className="link"
                      style={{ fontSize: 11, color: "#38bdf8", cursor: "pointer", border: "none", background: "none" }}
                      onClick={p.onOpenSettings}
                    >
                      Configurar Chave
                    </button>
                  )}
                </div>

                {/* Quick Keyword Chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {["cidade", "tecnologia", "dinheiro", "natureza", "pessoas", "computador"].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setPexelsQuery(chip);
                        handleSearchPexels(chip);
                      }}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "none",
                        color: "var(--muted, #94a3b8)",
                        padding: "2px 7px",
                        borderRadius: 4,
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {pexelsError && (
                  <p style={{ margin: 0, fontSize: 11, color: "#f87171", background: "rgba(239, 68, 68, 0.1)", padding: 6, borderRadius: 4 }}>
                    {pexelsError}
                  </p>
                )}

                {/* Pexels Videos Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, maxHeight: 380, overflowY: "auto", paddingRight: 2 }}>
                  {pexelsVideos.map((v) => {
                    const isDownloading = downloadingId === v.id;
                    return (
                      <div
                        key={v.id}
                        style={{
                          background: "#161926",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: 6,
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div style={{ position: "relative", width: "100%", height: 95, background: "#0a0c14" }}>
                          <img
                            src={v.image}
                            alt="Pexels preview"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            loading="lazy"
                          />
                          <span
                            style={{
                              position: "absolute",
                              bottom: 4,
                              right: 4,
                              background: "rgba(0, 0, 0, 0.75)",
                              color: "#fff",
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "1px 4px",
                              borderRadius: 3,
                            }}
                          >
                            {v.duration}s
                          </span>
                        </div>
                        <div style={{ padding: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                          <span style={{ fontSize: 10, color: "var(--muted, #94a3b8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {v.user?.name || "Pexels"}
                          </span>
                          <button
                            className="btn primary"
                            style={{ height: 22, padding: "0 6px", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}
                            onClick={() => handleDownloadPexels(v)}
                            disabled={isDownloading}
                            title="Baixar e adicionar à timeline"
                          >
                            {isDownloading ? <RefreshCw size={10} className="spin" /> : <Plus size={10} />}
                            <span>{isDownloading ? "Baixando" : "Inserir"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-tab 3: Auto B-Roll via AI */}
            {brollSubTab === "auto" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    background: "rgba(56, 189, 248, 0.08)",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#38bdf8" }}>
                      <Sparkles size={14} />
                      <span>Auto B-Roll (Sugestões de Fala)</span>
                    </div>
                    <button
                      className="btn primary"
                      style={{ height: 26, padding: "0 8px", fontSize: 11, display: "flex", gap: 4 }}
                      onClick={handleSuggestBroll}
                      disabled={suggestingBroll || !p.words?.length}
                    >
                      {suggestingBroll ? <RefreshCw size={11} className="spin" /> : <Sparkles size={11} />}
                      <span>{brollSuggestions ? "Reanalisar" : "Sugerir com IA"}</span>
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--muted, #94a3b8)", lineHeight: 1.4 }}>
                    A IA analisa onde o orador cita conceitos-chave e sugere clipes correspondentes para prender a atenção.
                  </p>
                </div>

                {suggestError && (
                  <p style={{ margin: 0, fontSize: 11, color: "#f87171", background: "rgba(239, 68, 68, 0.1)", padding: 6, borderRadius: 4 }}>
                    {suggestError}
                  </p>
                )}

                {!brollSuggestions && !suggestingBroll && (
                  <p className="empty">Clique no botão acima para analisar as falas do vídeo.</p>
                )}

                {brollSuggestions && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                    {brollSuggestions.map((sug, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#161926",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: 6,
                          padding: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{sug.keyword}</span>
                          <span style={{ fontSize: 10, color: "var(--muted, #94a3b8)", fontFamily: "monospace" }}>
                            {sug.start.toFixed(1)}s - {sug.end.toFixed(1)}s
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: "#cbd5e1", lineHeight: 1.3 }}>{sug.reason}</p>
                        <button
                          className="btn ghost"
                          style={{
                            height: 24,
                            padding: "0 8px",
                            fontSize: 11,
                            alignSelf: "flex-end",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onClick={() => {
                            setBrollSubTab("pexels");
                            setPexelsQuery(sug.englishKeyword || sug.keyword);
                            handleSearchPexels(sug.englishKeyword || sug.keyword);
                          }}
                        >
                          <Search size={11} />
                          <span>Buscar "{sug.englishKeyword || sug.keyword}" no Pexels</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
