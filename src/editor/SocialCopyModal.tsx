import React, { useState } from "react";
import { Copy, Check, Sparkles, X, Share2, Video, RefreshCw } from "lucide-react";
import { Project, VideoScene } from "../remotion/types";
import { postJson } from "./api";

type SocialCopyResult = {
  tiktok: {
    hook: string;
    caption: string;
    hashtags: string[];
  };
  instagram: {
    hook: string;
    caption: string;
    cta: string;
    hashtags: string[];
  };
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  project: Project;
};

export const SocialCopyModal: React.FC<Props> = ({ open, onClose, project }) => {
  const [tone, setTone] = useState<string>("viral");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialCopyResult | null>(null);
  const [activePlatform, setActivePlatform] = useState<"tiktok" | "instagram" | "youtube">("tiktok");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!open) return null;

  // Extract words from video scenes
  const allWords = project.scenes
    .filter((s): s is VideoScene => s.type === "video" && !!s.words?.length)
    .flatMap((s) => s.words || []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await postJson<SocialCopyResult>("/api/ai/copy", {
        words: allWords,
        title: project.name || "Vídeo Curto",
        tone,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar copies com IA.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal"
        style={{ maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #4f46e5, #9333ea)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Share2 size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Gerador de Copy & SEO para Redes Sociais</h2>
              <span style={{ fontSize: 12, color: "var(--muted, #94a3b8)" }}>
                Textos magnéticos e hashtags virais para TikTok, Instagram Reels e YouTube Shorts
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {/* Controls Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              background: "rgba(255, 255, 255, 0.03)",
              padding: 12,
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <span style={{ fontSize: 13, color: "var(--muted, #94a3b8)", whiteSpace: "nowrap" }}>Tom de Voz:</span>
              <select
                className="input"
                style={{ height: 34, fontSize: 13, padding: "0 10px" }}
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="viral">Viral & Alta Retenção (Ganchos Magnéticos)</option>
                <option value="educational">Educativo & Autoridade (Direto ao ponto)</option>
                <option value="storytelling">Storytelling & Narrativa Emocionante</option>
                <option value="humor">Descontraído & Provocativo</option>
              </select>
            </div>
            <button
              className="btn primary"
              style={{ height: 34, padding: "0 14px", display: "flex", alignItems: "center", gap: 6 }}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{result ? "Regerar Copies" : "Gerar com IA"}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#f87171",
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {!result && !loading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted, #94a3b8)",
                fontSize: 13,
              }}
            >
              <Video size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 500, color: "var(--fg, #e2e8f0)" }}>
                Transforme o conteúdo do seu vídeo em legendas prontas para postar.
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12 }}>
                {allWords.length > 0
                  ? `Analisaremos as ${allWords.length} palavras da transcrição do seu vídeo para criar ganchos de alta conversão.`
                  : "Dica: Para melhores resultados com IA, certifique-se de que o vídeo possui transcrição."}
              </p>
            </div>
          )}

          {result && (
            <div>
              {/* Platform Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  paddingBottom: 10,
                  marginBottom: 16,
                }}
              >
                {(
                  [
                    { id: "tiktok", label: "TikTok" },
                    { id: "instagram", label: "Instagram Reels" },
                    { id: "youtube", label: "YouTube Shorts" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActivePlatform(tab.id)}
                    style={{
                      background: activePlatform === tab.id ? "rgba(255, 255, 255, 0.1)" : "transparent",
                      border: "none",
                      color: activePlatform === tab.id ? "#fff" : "var(--muted, #94a3b8)",
                      padding: "6px 14px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: activePlatform === tab.id ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TikTok Content */}
              {activePlatform === "tiktok" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#38bdf8" }}>
                        Gancho Visual / Frase de Tela
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(result.tiktok.hook, "tt-hook")}
                      >
                        {copiedKey === "tt-hook" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "tt-hook" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff" }}>{result.tiktok.hook}</p>
                  </div>

                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#a78bfa" }}>
                        Legenda do Post
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(result.tiktok.caption, "tt-caption")}
                      >
                        {copiedKey === "tt-caption" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "tt-caption" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
                      {result.tiktok.caption}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#34d399" }}>
                        Hashtags Recomendadas
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(result.tiktok.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "), "tt-tags")}
                      >
                        {copiedKey === "tt-tags" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "tt-tags" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.tiktok.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            background: "rgba(52, 211, 153, 0.1)",
                            color: "#34d399",
                            fontSize: 12,
                            padding: "3px 8px",
                            borderRadius: 4,
                          }}
                        >
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn primary wide"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      const full = `${result.tiktok.hook}\n\n${result.tiktok.caption}\n\n${result.tiktok.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`;
                      copyToClipboard(full, "tt-full");
                    }}
                  >
                    {copiedKey === "tt-full" ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === "tt-full" ? "Post do TikTok Copiado!" : "Copiar Post Completo do TikTok"}</span>
                  </button>
                </div>
              )}

              {/* Instagram Reels Content */}
              {activePlatform === "instagram" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#f43f5e" }}>
                        Gancho da Primeira Linha
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(result.instagram.hook, "ig-hook")}
                      >
                        {copiedKey === "ig-hook" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "ig-hook" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff" }}>{result.instagram.hook}</p>
                  </div>

                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#a78bfa" }}>
                        Corpo do Post & CTA
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(`${result.instagram.caption}\n\n👉 ${result.instagram.cta}`, "ig-body")}
                      >
                        {copiedKey === "ig-body" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "ig-body" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
                      {result.instagram.caption}
                    </p>
                    <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 600, color: "#f43f5e" }}>
                      👉 {result.instagram.cta}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#34d399" }}>
                        Hashtags do Nicho
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(result.instagram.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "), "ig-tags")}
                      >
                        {copiedKey === "ig-tags" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "ig-tags" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.instagram.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            background: "rgba(244, 63, 94, 0.1)",
                            color: "#f43f5e",
                            fontSize: 12,
                            padding: "3px 8px",
                            borderRadius: 4,
                          }}
                        >
                          {tag.startsWith("#") ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn primary wide"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      const full = `${result.instagram.hook}\n\n${result.instagram.caption}\n\n👉 ${result.instagram.cta}\n\n.\n.\n${result.instagram.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`;
                      copyToClipboard(full, "ig-full");
                    }}
                  >
                    {copiedKey === "ig-full" ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === "ig-full" ? "Post do Instagram Copiado!" : "Copiar Post Completo do Reels"}</span>
                  </button>
                </div>
              )}

              {/* YouTube Shorts Content */}
              {activePlatform === "youtube" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#ef4444" }}>
                        Título CTR Alto (&lt; 70 Caracteres)
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(result.youtube.title, "yt-title")}
                      >
                        {copiedKey === "yt-title" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "yt-title" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{result.youtube.title}</p>
                    <span style={{ fontSize: 11, color: "var(--muted, #94a3b8)", marginTop: 4, display: "inline-block" }}>
                      {result.youtube.title.length} caracteres
                    </span>
                  </div>

                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#a78bfa" }}>
                        Descrição Otimizada para SEO
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(result.youtube.description, "yt-desc")}
                      >
                        {copiedKey === "yt-desc" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "yt-desc" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
                      {result.youtube.description}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#38bdf8" }}>
                        Tags para a Aba de Tags do YouTube
                      </span>
                      <button
                        className="btn ghost"
                        style={{ padding: "2px 8px", height: 24, fontSize: 12, display: "flex", gap: 4 }}
                        onClick={() => copyToClipboard(result.youtube.tags.join(", "), "yt-tags")}
                      >
                        {copiedKey === "yt-tags" ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
                        <span>{copiedKey === "yt-tags" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", fontFamily: "monospace" }}>
                      {result.youtube.tags.join(", ")}
                    </p>
                  </div>

                  <button
                    className="btn primary wide"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      const full = `${result.youtube.title}\n\n${result.youtube.description}\n\nTags:\n${result.youtube.tags.join(", ")}`;
                      copyToClipboard(full, "yt-full");
                    }}
                  >
                    {copiedKey === "yt-full" ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === "yt-full" ? "Short do YouTube Copiado!" : "Copiar Tudo do YouTube Shorts"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
