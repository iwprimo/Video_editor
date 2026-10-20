import React, { useRef, useState } from "react";
import { X, Image as ImageIcon, Download, Check, Sparkles, Layers, Sliders, Eye, Trash2 } from "lucide-react";
import type { CoverSettings, CoverStyle, CoverPosition, Project } from "../remotion/types";
import { DEFAULT_COVER, FORMATS } from "../remotion/types";

type Props = {
  open: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updater: (p: Project) => Project) => void;
};

const STYLES: { id: CoverStyle; name: string; desc: string; color: string; badgeBg: string; textCol: string }[] = [
  { id: "hormozi", name: "Hormozi Viral", desc: "Amarelo elétrico e contorno preto espesso", color: "#ffd84d", badgeBg: "#ffd84d", textCol: "#ffffff" },
  { id: "mrbeast", name: "MrBeast Impact", desc: "Verde neon fluorescente e sombra angular", color: "#22c55e", badgeBg: "#22c55e", textCol: "#ffffff" },
  { id: "neon", name: "Cyber Neon", desc: "Aura neon rosa/magenta pulsante", color: "#ec4899", badgeBg: "rgba(236,72,153,0.3)", textCol: "#ffffff" },
  { id: "box", name: "Dark Bold Box", desc: "Faixas pretas sólidas de alto contraste", color: "#ffd84d", badgeBg: "#000000", textCol: "#ffffff" },
  { id: "minimal", name: "Minimal Clean", desc: "Editorial limpo e espaçamento refinado", color: "#ffffff", badgeBg: "rgba(255,255,255,0.2)", textCol: "#ffffff" },
];

const QUICK_TAGS = ["DICA RÁPIDA", "SEGREDO", "TUTORIAL", "ATENÇÃO", "PASSO A PASSO", "VIRAL"];

const HOOK_SUGGESTIONS = [
  "O MAIOR SEGREDO QUE NINGUÉM TE CONTOU!",
  "PARE DE FAZER ISSO AGORA MESMO!",
  "COMO DOBRAR SEUS RESULTADOS EM 7 DIAS",
  "O MÉTODO DEFINITIVO PARA CRESCER",
  "NUNCA MAIS COMETA ESTE ERRO!",
];

export const CoverModal: React.FC<Props> = ({ open, onClose, project, onUpdateProject }) => {
  const currentCover: CoverSettings = project.cover?.title ? project.cover : { ...DEFAULT_COVER };

  const [title, setTitle] = useState(currentCover.title || "O SEGREDO QUE NINGUÉM CONTA!");
  const [subtitle, setSubtitle] = useState(currentCover.subtitle || "DICA RÁPIDA");
  const [style, setStyle] = useState<CoverStyle>(currentCover.style || "hormozi");
  const [position, setPosition] = useState<CoverPosition>(currentCover.position || "center");
  const [fontSize, setFontSize] = useState<number>(currentCover.fontSize ?? 1.1);
  const [darken, setDarken] = useState<number>(currentCover.darken ?? 0.45);
  const [blur, setBlur] = useState<number>(currentCover.blur ?? 0);
  const [durationSeconds, setDurationSeconds] = useState<number>(currentCover.durationSeconds ?? 0.1);
  const [showSafeZones, setShowSafeZones] = useState(true);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!open) return null;

  const fmt = FORMATS[project.format] ?? FORMATS.portrait;
  const isPortrait = project.format === "portrait";

  const handleApply = () => {
    onUpdateProject((p) => ({
      ...p,
      cover: {
        enabled: true,
        title,
        subtitle,
        style,
        position,
        fontSize,
        darken,
        blur,
        durationSeconds,
        color: STYLES.find((s) => s.id === style)?.color || "#ffd84d",
        textColor: "#ffffff",
        uppercase: true,
      },
    }));
    onClose();
  };

  const handleDisable = () => {
    onUpdateProject((p) => ({
      ...p,
      cover: {
        ...(p.cover ?? DEFAULT_COVER),
        enabled: false,
      },
    }));
    onClose();
  };

  const handleDownloadPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = fmt.width;
    canvas.height = fmt.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fundo
    ctx.fillStyle = "#0c0e17";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gradiente / Vinheta
    const grad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.2,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.8
    );
    grad.addColorStop(0, "rgba(20, 25, 45, 0.4)");
    grad.addColorStop(1, `rgba(0, 0, 0, ${Math.min(1, darken + 0.4)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const u = Math.min(canvas.width, canvas.height) / 1080;
    const activeColor = STYLES.find((s) => s.id === style)?.color || "#ffd84d";

    let targetY = canvas.height / 2;
    if (position === "top") targetY = canvas.height * 0.22;
    if (position === "bottom") targetY = canvas.height * 0.76;

    // Desenhar Subtítulo / Badge
    if (subtitle.trim()) {
      const badgeText = subtitle.toUpperCase();
      ctx.font = `900 ${Math.round(28 * u * fontSize)}px Inter, sans-serif`;
      const textWidth = ctx.measureText(badgeText).width;
      const padX = 26 * u;
      const padY = 12 * u;
      const badgeH = 46 * u * fontSize;
      const badgeW = textWidth + padX * 2;
      const badgeX = (canvas.width - badgeW) / 2;
      const badgeY = targetY - 90 * u * fontSize;

      if (style === "hormozi") {
        ctx.fillStyle = activeColor;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 9999);
        ctx.fill();
        ctx.fillStyle = "#121319";
      } else if (style === "mrbeast") {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12 * u);
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 4 * u;
        ctx.stroke();
        ctx.fillStyle = "#080c14";
      } else if (style === "neon") {
        ctx.fillStyle = "rgba(236, 72, 153, 0.35)";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 9999);
        ctx.fill();
        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = 3 * u;
        ctx.stroke();
        ctx.fillStyle = "#fdf4ff";
      } else if (style === "box") {
        ctx.fillStyle = "#000000";
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.fillStyle = activeColor;
        ctx.fillRect(badgeX, badgeY, 6 * u, badgeH);
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 9999);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, canvas.width / 2, badgeY + badgeH / 2);
    }

    // Desenhar Título Principal (com quebra de linha inteligente)
    const titleText = title.toUpperCase();
    const titleSize = Math.round(72 * u * fontSize);
    ctx.font = `900 ${titleSize}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const words = titleText.split(" ");
    const lines: string[] = [];
    let curLine = "";
    const maxLineW = canvas.width * 0.85;

    for (const w of words) {
      const test = curLine ? `${curLine} ${w}` : w;
      if (ctx.measureText(test).width > maxLineW && curLine) {
        lines.push(curLine);
        curLine = w;
      } else {
        curLine = test;
      }
    }
    if (curLine) lines.push(curLine);

    const lineH = titleSize * 1.15;
    const totalH = lines.length * lineH;
    let startY = targetY - totalH / 2 + lineH / 2;

    lines.forEach((l, idx) => {
      const y = startY + idx * lineH;

      if (style === "hormozi") {
        ctx.lineWidth = 14 * u * fontSize;
        ctx.strokeStyle = "#000000";
        ctx.lineJoin = "round";
        ctx.strokeText(l, canvas.width / 2, y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(l, canvas.width / 2, y);
      } else if (style === "mrbeast") {
        ctx.lineWidth = 16 * u * fontSize;
        ctx.strokeStyle = "#000000";
        ctx.lineJoin = "round";
        ctx.strokeText(l, canvas.width / 2, y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(l, canvas.width / 2, y);
      } else if (style === "neon") {
        ctx.shadowColor = "#ec4899";
        ctx.shadowBlur = 30 * u;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(l, canvas.width / 2, y);
        ctx.shadowBlur = 0;
      } else if (style === "box") {
        const lineW = ctx.measureText(l).width + 36 * u;
        ctx.fillStyle = "#000000";
        ctx.fillRect((canvas.width - lineW) / 2, y - lineH / 2 + 4 * u, lineW, lineH);
        ctx.fillStyle = activeColor;
        ctx.fillRect((canvas.width - lineW) / 2, y - lineH / 2 + 4 * u, 8 * u, lineH);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(l, canvas.width / 2, y);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(l, canvas.width / 2, y);
      }
    });

    // Baixar imagem
    const link = document.createElement("a");
    link.download = `capa-${project.name.toLowerCase().replace(/\s+/g, "-") || "video"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95vw",
          maxWidth: 960,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(18, 20, 28, 0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "linear-gradient(135deg, #ffd84d, #f97316)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#121319",
              }}
            >
              <ImageIcon size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f7f7fa" }}>
                Criador de Capa Viral (1º Frame / Thumbnail)
              </h2>
              <p style={{ fontSize: 12, margin: 0, color: "#94a3b8" }}>
                Gera títulos de alto CTR nos primeiros quadros para retenção e miniaturas nas redes sociais
              </p>
            </div>
          </div>
          <button className="btn icon ghost" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {/* Content Body (2 Columns) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 1fr) 1.25fr",
            gap: 20,
            padding: 22,
            overflowY: "auto",
            flex: 1,
          }}
        >
          {/* Coluna Esquerda: Preview da Capa */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
                <Eye size={14} color="#ffd84d" />
                Pré-visualização da Capa ({fmt.width}×{fmt.height})
              </span>
              <button
                type="button"
                className={`btn sm ghost ${showSafeZones ? "primary" : ""}`}
                onClick={() => setShowSafeZones(!showSafeZones)}
                style={{ fontSize: 11, padding: "2px 8px" }}
              >
                Safe Zones
              </button>
            </div>

            {/* Container do Preview com proporção fiel */}
            <div
              style={{
                width: "100%",
                maxWidth: 320,
                aspectRatio: `${fmt.width} / ${fmt.height}`,
                background: "#080c14",
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent:
                  position === "top"
                    ? "flex-start"
                    : position === "bottom"
                    ? "flex-end"
                    : "center",
                padding: "20px 14px",
                paddingTop: position === "top" ? (isPortrait ? "22%" : "12%") : "20px",
                paddingBottom: position === "bottom" ? (isPortrait ? "26%" : "16%") : "20px",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              {/* Fundo com escurecimento e vinheta */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: `rgba(0, 0, 0, ${darken})`,
                  backgroundImage: `radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, ${Math.min(1, darken + 0.35)}) 100%)`,
                  backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
                  pointerEvents: "none",
                }}
              />

              {/* Safe Zones Overlay (se ativado) */}
              {showSafeZones && isPortrait ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderTop: "2px dashed rgba(239, 68, 68, 0.4)",
                    borderBottom: "2px dashed rgba(239, 68, 68, 0.4)",
                    pointerEvents: "none",
                  }}
                >
                  <span style={{ position: "absolute", top: 8, right: 8, fontSize: 9, color: "rgba(239, 68, 68, 0.7)" }}>Área Segura Topo</span>
                  <span style={{ position: "absolute", bottom: 8, right: 8, fontSize: 9, color: "rgba(239, 68, 68, 0.7)" }}>Área Segura Base</span>
                </div>
              ) : null}

              {/* Conteúdo Tipográfico da Capa */}
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  width: "100%",
                }}
              >
                {/* Badge Subtítulo */}
                {subtitle ? (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px 12px",
                      borderRadius: style === "box" ? 0 : 9999,
                      fontSize: 10 * fontSize,
                      fontWeight: 900,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      ...(style === "hormozi"
                        ? { background: "#ffd84d", color: "#121319", boxShadow: "0 2px 10px rgba(255,216,77,0.4)" }
                        : style === "mrbeast"
                        ? { background: "#22c55e", color: "#080c14", border: "1.5px solid #000" }
                        : style === "neon"
                        ? { background: "rgba(236,72,153,0.3)", color: "#fdf4ff", border: "1px solid #ec4899", boxShadow: "0 0 10px rgba(236,72,153,0.5)" }
                        : style === "box"
                        ? { background: "#000", color: "#ffd84d", borderLeft: "3px solid #ffd84d", padding: "3px 8px" }
                        : { background: "rgba(255,255,255,0.2)", color: "#fff" }),
                    }}
                  >
                    {subtitle.toUpperCase()}
                  </div>
                ) : null}

                {/* Título Principal */}
                <div
                  style={{
                    fontSize: 22 * fontSize,
                    lineHeight: 1.1,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: style === "minimal" ? "0.02em" : "-0.02em",
                    ...(style === "hormozi"
                      ? {
                          color: "#ffffff",
                          WebkitTextStroke: "2.5px #000000",
                          paintOrder: "stroke fill",
                          textShadow: "0 4px 12px rgba(0, 0, 0, 0.9)",
                        }
                      : style === "mrbeast"
                      ? {
                          color: "#ffffff",
                          WebkitTextStroke: "3px #000000",
                          paintOrder: "stroke fill",
                          transform: "rotate(-1.5deg)",
                        }
                      : style === "neon"
                      ? {
                          color: "#ffffff",
                          textShadow: "0 0 12px #ec4899, 0 0 24px #ec4899, 0 2px 8px #000",
                        }
                      : style === "box"
                      ? {
                          background: "#000000",
                          color: "#ffffff",
                          padding: "6px 10px",
                          borderLeft: "4px solid #ffd84d",
                        }
                      : {
                          color: "#ffffff",
                          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                        }),
                  }}
                >
                  {title}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 11, color: "#64748b", textAlign: "center", marginTop: 8 }}>
              O primeiro frame define a capa e a retenção nos primeiros segundos das redes sociais.
            </p>
          </div>

          {/* Coluna Direita: Controles e Estilos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Título Principal */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                Título Principal da Capa
              </label>
              <textarea
                className="input area"
                rows={2}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: O SEGREDO QUE NINGUÉM CONTA!"
                style={{ fontSize: 13, fontWeight: 700 }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {HOOK_SUGGESTIONS.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    className="btn ghost sm-text"
                    onClick={() => setTitle(h)}
                    style={{ fontSize: 10, padding: "2px 6px" }}
                  >
                    + {h.slice(0, 24)}…
                  </button>
                ))}
              </div>
            </div>

            {/* Subtítulo / Badge */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                Subtítulo / Badge de Categoria
              </label>
              <input
                className="input"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Ex: DICA RÁPIDA, TUTORIAL..."
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {QUICK_TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn ghost sm-text ${subtitle === t ? "primary" : ""}`}
                    onClick={() => setSubtitle(t)}
                    style={{ fontSize: 10, padding: "2px 8px" }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Estilo Visual da Capa */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                Estilo Visual (Templates Virais)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`btn ${style === s.id ? "primary" : "ghost"}`}
                    onClick={() => setStyle(s.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 8,
                      padding: "8px 10px",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: s.color,
                        flex: "none",
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.1 }}>{s.name}</div>
                      <div style={{ fontSize: 10, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Posição e Duração */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  Posição Vertical
                </label>
                <select className="input" value={position} onChange={(e) => setPosition(e.target.value as CoverPosition)}>
                  <option value="center">Centro do Quadro</option>
                  <option value="top">Topo (Abaixo da barra)</option>
                  <option value="bottom">Base (Acima do texto)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  Exibição no Vídeo
                </label>
                <select
                  className="input"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                >
                  <option value={0.1}>Apenas 1º Frame (Thumbnail)</option>
                  <option value={1.0}>1 Segundo (Gancho rápido)</option>
                  <option value={2.0}>2 Segundos (Intro completa)</option>
                  <option value={3.0}>3 Segundos (Abertura)</option>
                </select>
              </div>
            </div>

            {/* Ajustes de Escurecimento e Tamanho */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  <span>Escurecimento Fundo</span>
                  <span>{Math.round(darken * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={darken}
                  onChange={(e) => setDarken(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 4 }}>
                  <span>Tamanho do Título</span>
                  <span>{Math.round(fontSize * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 22px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(18, 20, 28, 0.7)",
          }}
        >
          <div>
            {project.cover?.enabled ? (
              <button
                type="button"
                className="btn ghost danger"
                onClick={handleDisable}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Trash2 size={14} />
                Remover Capa do Vídeo
              </button>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="btn ghost"
              onClick={handleDownloadPng}
              title="Baixar imagem PNG em alta resolução para enviar como miniatura no YouTube ou Instagram"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Download size={14} />
              Baixar Imagem PNG
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleApply}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Check size={14} />
              Aplicar no Vídeo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
