import React, { useState } from "react";
import { EXPORT_PLATFORMS, ExportPlatform, ExportQuality, FORMATS, FormatId, Project } from "../remotion/types";

type Props = {
  open: boolean;
  onClose: () => void;
  project: Project;
  onAdjustFormat?: (format: FormatId) => void;
  flash?: (msg: string) => void;
};

type RenderStatus = "idle" | "running" | "done" | "error";

export const ExportModal: React.FC<Props> = ({ open, onClose, project, onAdjustFormat, flash }) => {
  const [platform, setPlatform] = useState<ExportPlatform>(
    project.format === "portrait" ? "reels" : project.format === "square" ? "feed" : "landscape",
  );
  const [quality, setQuality] = useState<ExportQuality>("high");
  const [customName, setCustomName] = useState(project.name || "video");
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Preparando");
  const [renderId, setRenderId] = useState("");
  const [exportedFile, setExportedFile] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!open) return null;

  const currentPlatformInfo = EXPORT_PLATFORMS[platform];
  const isFormatMismatch = project.format !== currentPlatformInfo.format;

  const startRender = async () => {
    setStatus("running");
    setProgress(0);
    setStage("Iniciando exportação");
    setErrorMsg("");

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project,
          options: {
            platform,
            quality,
            crf: currentPlatformInfo.crf,
            customName: customName.trim() || project.name,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro ${res.status}`);
      }

      const { id } = (await res.json()) as { id: string };
      setRenderId(id);

      const poll = async (): Promise<void> => {
        const s = await fetch(`/api/render/${id}`).then((x) => x.json());
        if (s.status === "done") {
          setStatus("done");
          setExportedFile(s.file);
          setProgress(1);
          setStage("Concluído");
          flash?.(`🎉 Vídeo renderizado com sucesso: ${s.file}`);
          return;
        }
        if (s.status === "error") throw new Error(s.error);
        setProgress(s.progress ?? 0);
        setStage(s.stage ?? "Renderizando");
        await new Promise((r) => setTimeout(r, 500));
        return poll();
      };

      await poll();
    } catch (e) {
      setStatus("error");
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(
        msg.includes("Failed to fetch") || msg.includes("500") || msg.includes("502")
          ? "O servidor de renderização local não respondeu. Certifique-se de que o npm run dev ou iniciar.bat está rodando."
          : msg,
      );
    }
  };

  const handleAdjustFormat = () => {
    if (onAdjustFormat) {
      onAdjustFormat(currentPlatformInfo.format);
      flash?.(`Formato ajustado para ${FORMATS[currentPlatformInfo.format].label}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={status === "running" ? undefined : onClose}>
      <div className="modal export-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Exportar Vídeo para Redes Sociais</h2>
          {status !== "running" ? (
            <button type="button" className="btn icon ghost" onClick={onClose} aria-label="Fechar">
              ×
            </button>
          ) : null}
        </div>

        <div className="modal-body">
          {status === "idle" ? (
            <>
              {/* Plataformas */}
              <div className="field">
                <span className="field-label" style={{ fontWeight: 600 }}>Escolha a Plataforma / Destino</span>
                <div className="export-platform-grid">
                  {(Object.keys(EXPORT_PLATFORMS) as ExportPlatform[]).map((key) => {
                    const info = EXPORT_PLATFORMS[key];
                    const isSelected = platform === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`export-platform-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setPlatform(key)}
                      >
                        <span className="ep-icon">{info.icon}</span>
                        <div className="ep-info">
                          <span className="ep-name">{info.name}</span>
                          <span className="ep-res">{info.width}×{info.height}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="field-hint" style={{ marginTop: -4 }}>
                {currentPlatformInfo.hint}
              </p>

              {/* Aviso se o formato do projeto for diferente do alvo */}
              {isFormatMismatch ? (
                <div className="callout-box" style={{ background: "rgba(255, 216, 77, 0.08)", borderColor: "rgba(255, 216, 77, 0.3)" }}>
                  <div style={{ fontSize: 13, color: "#ffd84d", fontWeight: 600 }}>
                    ⚠️ Formato diferente da plataforma
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.4 }}>
                    O projeto atual está configurado como <b>{FORMATS[project.format].label}</b>, mas você escolheu exportar para <b>{currentPlatformInfo.name} ({FORMATS[currentPlatformInfo.format].label})</b>.
                  </div>
                  {onAdjustFormat ? (
                    <button
                      type="button"
                      className="btn sm"
                      style={{ alignSelf: "flex-start", marginTop: 4, background: "#ffd84d", color: "#14161f" }}
                      onClick={handleAdjustFormat}
                    >
                      ⚡ Ajustar formato do projeto agora
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Qualidade da Codificação</span>
                  <select className="input" value={quality} onChange={(e) => setQuality(e.target.value as ExportQuality)}>
                    <option value="high">Alta Definição (CRF {currentPlatformInfo.crf} · Redes Sociais)</option>
                    <option value="standard">Padrão (CRF 22 · Renderização Rápida)</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">Nome do Arquivo</span>
                  <input
                    type="text"
                    className="input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Nome do vídeo"
                  />
                </label>
              </div>
            </>
          ) : null}

          {status === "running" ? (
            <div className="export-status-panel">
              <span className="ep-status-icon">⚙️</span>
              <div className="ep-status-stage">{stage}…</div>
              <div className="export-progress-bar">
                <div className="export-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="ep-status-pct">{Math.round(progress * 100)}%</div>
              <p className="field-hint" style={{ textAlign: "center", marginTop: 8 }}>
                O Remotion está compilando os quadros e gerando o arquivo MP4 otimizado com áudio AAC.
              </p>
            </div>
          ) : null}

          {status === "done" ? (
            <div className="export-status-panel success">
              <span className="ep-status-icon">🎉</span>
              <div className="ep-status-stage">Vídeo pronto para publicação!</div>
              <p className="field-hint" style={{ textAlign: "center", color: "var(--ink)", fontWeight: 500 }}>
                Arquivo gerado: <code>{exportedFile}</code>
              </p>
              <div className="row-actions" style={{ justifyContent: "center", marginTop: 14 }}>
                <a
                  className="btn primary"
                  href={`/api/download/${renderId}`}
                  download={exportedFile}
                  style={{ textDecoration: "none", padding: "8px 20px", fontSize: 14 }}
                >
                  ⬇️ Baixar MP4
                </a>
                <button type="button" className="btn ghost" onClick={onClose}>
                  Fechar
                </button>
              </div>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="export-status-panel error">
              <span className="ep-status-icon">❌</span>
              <div className="ep-status-stage">Falha na renderização</div>
              <p className="field-hint" style={{ textAlign: "center", color: "var(--danger)" }}>
                {errorMsg}
              </p>
              <div className="row-actions" style={{ justifyContent: "center", marginTop: 14 }}>
                <button type="button" className="btn primary" onClick={startRender}>
                  Tentar novamente
                </button>
                <button type="button" className="btn ghost" onClick={() => setStatus("idle")}>
                  Alterar configurações
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {status === "idle" ? (
          <div className="modal-foot">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn primary" onClick={startRender}>
              🚀 Iniciar Renderização MP4
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
