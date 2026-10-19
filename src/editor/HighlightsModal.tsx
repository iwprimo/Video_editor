import React, { useState } from "react";
import { Sparkles, Play, Scissors, Plus, X, Flame, Clock, Award, RefreshCw, Check } from "lucide-react";
import { Project, VideoScene } from "../remotion/types";
import { postJson } from "./api";

export type Highlight = {
  id: string;
  title: string;
  score: number;
  hook: string;
  start: number;
  end: number;
  summary: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  project: Project;
  onApplyHighlight: (highlight: Highlight, mode: "isolate" | "newScene") => void;
  onPreviewTime?: (seconds: number) => void;
};

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const HighlightsModal: React.FC<Props> = ({
  open,
  onClose,
  project,
  onApplyHighlight,
  onPreviewTime,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Highlight[] | null>(null);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  if (!open) return null;

  const videoScene = project.scenes.find((s): s is VideoScene => s.type === "video");
  const words = videoScene?.words || [];

  const handleExtract = async () => {
    if (!words.length) {
      setError("O vídeo atual não possui palavras transcritas. Transcreva o vídeo primeiro na aba Vídeo.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await postJson<{ highlights: Highlight[] }>("/api/ai/highlights", {
        words,
        title: project.name || videoScene?.name || "Vídeo",
      });
      setHighlights(res.highlights || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao extrair melhores momentos.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (h: Highlight, mode: "isolate" | "newScene") => {
    onApplyHighlight(h, mode);
    setAppliedId(h.id);
    setTimeout(() => {
      setAppliedId(null);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal"
        style={{ maxWidth: 740, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #ef4444, #f59e0b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Flame size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                Extrator de Melhores Momentos (Opus Clip Local)
              </h2>
              <span style={{ fontSize: 12, color: "var(--muted, #94a3b8)" }}>
                Identifique automaticamente os trechos mais virais para transformar em Shorts e Reels
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {/* Header Action Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              background: "rgba(255, 255, 255, 0.03)",
              padding: 14,
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                <Clock size={15} color="#38bdf8" />
                <span>
                  {videoScene
                    ? `Vídeo: ${videoScene.name} (${formatTime(videoScene.srcDuration)})`
                    : "Nenhum vídeo importado"}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted, #94a3b8)", marginTop: 2, display: "block" }}>
                {words.length > 0
                  ? `${words.length} palavras prontas para análise de retenção e viralidade.`
                  : "Gere a transcrição do vídeo para habilitar a IA."}
              </span>
            </div>

            <button
              className="btn primary"
              style={{ height: 36, padding: "0 16px", display: "flex", alignItems: "center", gap: 6 }}
              onClick={handleExtract}
              disabled={loading || !words.length}
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Analisando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{highlights ? "Reanalisar Momentos" : "Encontrar Melhores Momentos"}</span>
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

          {!highlights && !loading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted, #94a3b8)",
                fontSize: 13,
              }}
            >
              <Scissors size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 500, color: "var(--fg, #e2e8f0)" }}>
                Crie cortes perfeitos de 20s a 60s em segundos.
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, maxWidth: 460, marginInline: "auto" }}>
                A IA analisa o gancho inicial, a narrativa e a conclusão de cada fala para identificar os trechos
                com maior potencial de retenção para TikTok, Reels e YouTube Shorts.
              </p>
            </div>
          )}

          {highlights && highlights.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {highlights.map((h) => {
                const dur = Math.round(h.end - h.start);
                const scoreColor =
                  h.score >= 90 ? "#22c55e" : h.score >= 80 ? "#3b82f6" : h.score >= 70 ? "#eab308" : "#94a3b8";
                const isApplied = appliedId === h.id;

                return (
                  <div
                    key={h.id}
                    style={{
                      background: "#161926",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 10,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {/* Virality Score Badge */}
                          <span
                            style={{
                              background: `${scoreColor}18`,
                              color: scoreColor,
                              border: `1px solid ${scoreColor}40`,
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 4,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Award size={12} />
                            Score {h.score}/100
                          </span>

                          <span style={{ fontSize: 12, color: "var(--muted, #94a3b8)", fontFamily: "monospace" }}>
                            {formatTime(h.start)} - {formatTime(h.end)} ({dur}s)
                          </span>
                        </div>

                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{h.title}</h3>
                      </div>

                      {onPreviewTime && (
                        <button
                          className="btn ghost"
                          style={{ height: 30, padding: "0 10px", fontSize: 12, display: "flex", gap: 4 }}
                          onClick={() => onPreviewTime(h.start)}
                          title="Tocar trecho no reprodutor"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Ouvir</span>
                        </button>
                      )}
                    </div>

                    {/* Hook Analysis */}
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        borderLeft: "3px solid #38bdf8",
                        padding: "8px 12px",
                        borderRadius: "0 6px 6px 0",
                        fontSize: 12,
                        color: "#cbd5e1",
                      }}
                    >
                      <strong style={{ color: "#38bdf8" }}>Gancho: </strong>
                      {h.hook}
                    </div>

                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted, #94a3b8)", fontStyle: "italic" }}>
                      "{h.summary}"
                    </p>

                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 8,
                        marginTop: 4,
                        borderTop: "1px solid rgba(255, 255, 255, 0.04)",
                        paddingTop: 10,
                      }}
                    >
                      <button
                        className="btn ghost"
                        style={{ height: 32, fontSize: 12, display: "flex", gap: 6 }}
                        onClick={() => handleApply(h, "newScene")}
                        disabled={isApplied}
                      >
                        <Plus size={13} />
                        <span>Duplicar como Nova Cena</span>
                      </button>

                      <button
                        className="btn primary"
                        style={{ height: 32, fontSize: 12, display: "flex", gap: 6 }}
                        onClick={() => handleApply(h, "isolate")}
                        disabled={isApplied}
                      >
                        {isApplied ? (
                          <>
                            <Check size={13} />
                            <span>Aplicado!</span>
                          </>
                        ) : (
                          <>
                            <Scissors size={13} />
                            <span>Transformar em Short</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
