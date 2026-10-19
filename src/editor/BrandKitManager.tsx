import React, { useEffect, useState } from "react";
import { Sparkles, Save } from "lucide-react";
import { BRAND_KITS, BrandKit, Project, Scene } from "../remotion/types";

const STORAGE_KEY = "editor_custom_brand_kits";

type Props = {
  project: Project;
  onProject: (patch: Partial<Project>, mergeKey?: string) => void;
  onRepurposeForSocial?: () => void;
  flash?: (msg: string) => void;
};

export const BrandKitManager: React.FC<Props> = ({ project, onProject, onRepurposeForSocial, flash }) => {
  const [customKits, setCustomKits] = useState<BrandKit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState<string>("hormozi");
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  // Carrega kits customizados do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomKits(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveCustomKitsToStorage = (kits: BrandKit[]) => {
    setCustomKits(kits);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kits));
    } catch {
      /* ignore */
    }
  };

  const allKits: BrandKit[] = [...BRAND_KITS, ...customKits];
  const activeKit = allKits.find((k) => k.id === selectedKitId) ?? BRAND_KITS[0];

  const applyKit = (kit: BrandKit) => {
    const patch: Partial<Project> = {
      theme: kit.theme,
    };
    if (kit.captions) {
      patch.captions = {
        ...(project.captions ?? {}),
        ...kit.captions,
      } as any;
    }
    if (kit.progressBar) {
      patch.progressBar = {
        ...(project.progressBar ?? {}),
        ...kit.progressBar,
      } as any;
    }
    if (kit.audio) {
      patch.audio = {
        ...(project.audio ?? {}),
        ...kit.audio,
      } as any;
    }
    onProject(patch);
    flash?.(`Brand Kit "${kit.name}" aplicado com sucesso!`);
  };

  const handleSaveCurrentAsKit = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    const newKit: BrandKit = {
      id: `custom-${Date.now().toString(36)}`,
      name: trimmed,
      description: "Brand Kit personalizado salvo a partir do projeto atual.",
      theme: { ...project.theme },
      captions: project.captions ? { ...project.captions } : {},
      progressBar: project.progressBar ? { ...project.progressBar } : undefined,
      audio: project.audio ? { ...project.audio } : undefined,
    };

    const next = [...customKits, newKit];
    saveCustomKitsToStorage(next);
    setSelectedKitId(newKit.id);
    setIsSavingCustom(false);
    setCustomName("");
    flash?.(`Brand Kit "${trimmed}" salvo com sucesso!`);
  };

  const handleDeleteCustomKit = (id: string) => {
    const next = customKits.filter((k) => k.id !== id);
    saveCustomKitsToStorage(next);
    if (selectedKitId === id) setSelectedKitId("hormozi");
    flash?.("Brand Kit removido.");
  };

  const isCustomSelected = customKits.some((k) => k.id === selectedKitId);

  return (
    <div className="brand-kit-box">
      {/* 1-Click Repurposing Card */}
      {project.format !== "portrait" && onRepurposeForSocial ? (
        <div className="repurpose-card">
          <div className="repurpose-head">
            <span className="repurpose-badge" style={{ display: "inline-flex", alignItems: "center" }}>
              <Sparkles size={12} style={{ marginRight: 4 }} />
              1-Click Repurposing
            </span>
            <span className="repurpose-title">Converter para Reels/TikTok 9:16</span>
          </div>
          <p className="repurpose-desc">
            Ajusta proporção para vertical, ativa fundo desfocado (Smart Blur), Safe Zones, zoom dinâmico (Punch-in) e Barra de Retenção.
          </p>
          <button
            type="button"
            className="btn primary sm wide"
            onClick={onRepurposeForSocial}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            <Sparkles size={14} style={{ marginRight: 6 }} />
            Converter este vídeo para 9:16
          </button>
        </div>
      ) : null}

      <div className="group-title" style={{ marginTop: 12 }}>
        Brand Kits & Identidade Visual
      </div>

      <div className="field">
        <span className="field-label">Selecione o Brand Kit</span>
        <select
          className="input"
          value={selectedKitId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedKitId(id);
            const k = allKits.find((item) => item.id === id);
            if (k) applyKit(k);
          }}
        >
          <optgroup label="Presets de Criadores">
            {BRAND_KITS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </optgroup>
          {customKits.length ? (
            <optgroup label="Seus Brand Kits Salvos">
              {customKits.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>

      {/* Kit Preview Card */}
      {activeKit ? (
        <div className="brand-kit-preview">
          <div className="bk-preview-row">
            <div className="bk-colors">
              <span className="bk-dot" style={{ background: activeKit.theme.bg }} title="Fundo" />
              <span className="bk-dot" style={{ background: activeKit.theme.accent }} title="Destaque" />
              <span className="bk-dot" style={{ background: activeKit.theme.ink }} title="Texto" />
            </div>
            <span className="bk-title">{activeKit.name}</span>
          </div>

          <p className="bk-desc">{activeKit.description}</p>

          <div className="bk-tags">
            {activeKit.captions?.style ? (
              <span className="bk-tag">Legenda: {activeKit.captions.style}</span>
            ) : null}
            {activeKit.progressBar?.enabled ? (
              <span className="bk-tag">Barra: {activeKit.progressBar.position === "top" ? "Topo" : "Base"}</span>
            ) : null}
            {activeKit.audio?.preset ? (
              <span className="bk-tag">Áudio: {activeKit.audio.preset}</span>
            ) : null}
          </div>

          <div className="row-actions" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn primary sm"
              style={{ flex: 1 }}
              onClick={() => applyKit(activeKit)}
            >
              Aplicar ao Vídeo
            </button>

            {isCustomSelected ? (
              <button
                type="button"
                className="btn ghost danger sm"
                onClick={() => handleDeleteCustomKit(selectedKitId)}
                title="Excluir este kit customizado"
              >
                Excluir
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Salvar Estilo Atual */}
      <div style={{ marginTop: 10 }}>
        {isSavingCustom ? (
          <div className="callout-box" style={{ padding: 10 }}>
            <span className="field-label" style={{ fontWeight: 600 }}>Nome do seu Brand Kit</span>
            <input
              type="text"
              className="input sm"
              placeholder="Ex: Minha Empresa Tech, Dark Vibe..."
              value={customName}
              autoFocus
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCurrentAsKit();
                if (e.key === "Escape") setIsSavingCustom(false);
              }}
            />
            <div className="row-actions" style={{ marginTop: 6 }}>
              <button
                type="button"
                className="btn primary sm"
                disabled={!customName.trim()}
                onClick={handleSaveCurrentAsKit}
              >
                Salvar Kit
              </button>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setIsSavingCustom(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn ghost sm wide"
            onClick={() => setIsSavingCustom(true)}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
          >
            <Save size={14} style={{ marginRight: 6 }} />
            Salvar estilo atual como Brand Kit
          </button>
        )}
      </div>
    </div>
  );
};
