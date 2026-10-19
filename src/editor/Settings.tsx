import React, { useEffect, useState } from "react";
import { getJson, postJson } from "./api";

export type PublicConfig = {
  anthropicKey: string;
  hasAnthropicKey: boolean;
  anthropicKeyProblem?: string | null;
  anthropicKeyFromEnv?: boolean;
  anthropicModel: string;
  promptProvider: "api" | "claude-code";
  claudeCodePath: string;
  openaiKey: string;
  hasOpenaiKey: boolean;
  openaiKeyProblem?: string | null;
  imageModel: string;
  imageQuality: string;
  geminiKey: string;
  hasGeminiKey: boolean;
  geminiKeyProblem?: string | null;
  geminiModel: string;
  geminiImageSize: string;
  imageProvider: "gemini" | "openai";
  whisperModel: string;
  language: string;
};

type CCStatus = {
  found: boolean;
  path?: string;
  version?: string | null;
  loggedIn?: boolean | null;
  authMethod?: string | null;
  email?: string | null;
  ok?: boolean;
  message: string;
};

type Props = { open: boolean; onClose: () => void; onSaved: (c: PublicConfig) => void };

export const loadConfig = () => getJson<PublicConfig>("/api/config");

// Situação da chave salva, sempre visível abaixo do campo
const KeyStatus: React.FC<{ has: boolean; masked: string; problem?: string | null; fromEnv?: boolean; onClear: () => void }> = ({
  has,
  masked,
  problem,
  fromEnv,
  onClear,
}) => {
  if (!has) return <span className="key-status none">Nenhuma chave salva</span>;
  return (
    <span className={`key-status ${problem ? "bad" : "ok"}`}>
      <span>
        {problem ? `Chave salva inválida (${masked}). ${problem}` : `Chave salva: ${masked}${fromEnv ? " (da variável de ambiente)" : ""}`}
      </span>
      <button type="button" className="link" onClick={onClear}>
        Remover
      </button>
    </span>
  );
};

export const Settings: React.FC<Props> = ({ open, onClose, onSaved }) => {
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cc, setCc] = useState<CCStatus | null>(null);
  const [ccChecking, setCcChecking] = useState(false);

  const checkCC = async (customPath?: string) => {
    setCcChecking(true);
    try {
      const q = customPath?.trim() ? `?path=${encodeURIComponent(customPath.trim())}` : "";
      setCc(await getJson<CCStatus>(`/api/claude-code/status${q}`));
    } catch (e) {
      setCc({ found: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setCcChecking(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    setAnthropicKey("");
    setOpenaiKey("");
    setGeminiKey("");
    setCc(null);
    loadConfig()
      .then((c) => {
        setCfg(c);
        if (c.promptProvider === "claude-code") checkCC(c.claudeCodePath);
      })
      .catch((e) => setError(e.message));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const set = (k: keyof PublicConfig, v: string) => setCfg((c) => (c ? { ...c, [k]: v } : c));

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const out = await postJson<PublicConfig>("/api/config", {
        anthropicKey,
        anthropicModel: cfg.anthropicModel,
        promptProvider: cfg.promptProvider,
        claudeCodePath: cfg.claudeCodePath ?? "",
        openaiKey,
        imageModel: cfg.imageModel,
        imageQuality: cfg.imageQuality,
        geminiKey,
        geminiModel: cfg.geminiModel,
        geminiImageSize: cfg.geminiImageSize,
        imageProvider: cfg.imageProvider,
        whisperModel: cfg.whisperModel,
        language: cfg.language,
      });
      onSaved(out);
      setCfg(out);
      setAnthropicKey("");
      setOpenaiKey("");
      setGeminiKey("");
      setSaved(true);
      setTimeout(onClose, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const clear = async (key: "anthropicKey" | "openaiKey" | "geminiKey") => {
    const out = await postJson<PublicConfig>("/api/config/clear", { key });
    setCfg(out);
    onSaved(out);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-head">
          <h2 id="settings-title">Configurações</h2>
          <button className="btn icon ghost" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {saved ? <p className="form-ok" role="status">Configurações salvas.</p> : null}
        {!cfg ? (
          <p className="muted">Carregando…</p>
        ) : (
          <div className="modal-body">
            <section>
              <h3>Edição por prompt (Claude)</h3>
              <div className="field">
                <span className="field-label">Como acessar o Claude</span>
                <div className="segmented flush" role="radiogroup" aria-label="Como acessar o Claude">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={cfg.promptProvider === "claude-code"}
                    className={`seg${cfg.promptProvider === "claude-code" ? " on" : ""}`}
                    onClick={() => {
                      set("promptProvider", "claude-code");
                      if (!cc) checkCC(cfg.claudeCodePath);
                    }}
                  >
                    Minha assinatura
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={cfg.promptProvider !== "claude-code"}
                    className={`seg${cfg.promptProvider !== "claude-code" ? " on" : ""}`}
                    onClick={() => set("promptProvider", "api")}
                  >
                    Chave de API
                  </button>
                </div>
                <span className="field-hint">
                  {cfg.promptProvider === "claude-code"
                    ? "Usa o Claude Code instalado neste computador, com o login da sua conta Pro ou Max. Não gasta créditos: desconta dos limites do plano."
                    : "Usa uma chave da API da Anthropic. Cobra créditos comprados em platform.claude.com, separados da assinatura."}
                </span>
              </div>
              {cfg.promptProvider === "claude-code" ? (
                <div className="field">
                  <span className="field-label">Claude Code</span>
                  <div className={`cc-status ${ccChecking || !cc ? "wait" : cc.ok ? "ok" : "bad"}`} role="status">
                    <span className="cc-dot" aria-hidden />
                    <span className="cc-text">
                      {ccChecking || !cc ? (
                        "Verificando…"
                      ) : (
                        <>
                          <strong>{cc.found ? `Claude Code ${cc.version ?? ""}`.trim() : "Não encontrado"}</strong>
                          <span>
                            {cc.message}
                            {cc.email ? ` (${cc.email})` : ""}
                          </span>
                        </>
                      )}
                    </span>
                    <button type="button" className="link" disabled={ccChecking} onClick={() => checkCC(cfg.claudeCodePath)}>
                      Verificar de novo
                    </button>
                  </div>
                  {cc && !cc.found ? (
                    <input
                      className="input"
                      placeholder="Caminho do claude.exe (opcional), ex.: C:\Users\voce\.local\bin\claude.exe"
                      value={cfg.claudeCodePath ?? ""}
                      onChange={(e) => set("claudeCodePath", e.target.value)}
                      onBlur={() => cfg.claudeCodePath?.trim() && checkCC(cfg.claudeCodePath)}
                    />
                  ) : null}
                </div>
              ) : null}
              <label className="field" hidden={cfg.promptProvider === "claude-code"}>
                <span className="field-label">Chave da API da Anthropic</span>
                <input
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder={cfg.hasAnthropicKey ? "Cole uma chave nova para trocar" : "sk-ant-api03-…"}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
                <KeyStatus
                  has={cfg.hasAnthropicKey}
                  masked={cfg.anthropicKey}
                  problem={cfg.anthropicKeyProblem}
                  fromEnv={cfg.anthropicKeyFromEnv}
                  onClear={() => clear("anthropicKey")}
                />
                <span className="field-hint">
                  Crie em platform.claude.com › API Keys › Create Key e copie a chave inteira, que começa com sk-ant- (ela só
                  aparece uma vez). O código apikey_… da lista é só o ID e não funciona. Fica só neste computador (config.json).
                </span>
              </label>
              <label className="field">
                <span className="field-label">Modelo</span>
                <select className="input" value={cfg.anthropicModel} onChange={(e) => set("anthropicModel", e.target.value)}>
                  <option value="claude-sonnet-5-5">Claude Sonnet 5.5 — equilíbrio (recomendado)</option>
                  <option value="claude-opus-5-5">
                    Claude Opus 5.5 — pedidos complexos{cfg.promptProvider === "claude-code" ? ", gasta mais do limite" : ", mais caro"}
                  </option>
                  <option value="claude-haiku-5-5">
                    Claude Haiku 5.5 — mais rápido{cfg.promptProvider === "claude-code" ? ", gasta menos do limite" : " e barato"}
                  </option>
                </select>
              </label>
            </section>

            <section>
              <h3>Transcrição (Whisper, no seu computador)</h3>
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Modelo</span>
                  <select className="input" value={cfg.whisperModel} onChange={(e) => set("whisperModel", e.target.value)}>
                    <option value="tiny">Tiny — 75 MB, rápido, menos preciso</option>
                    <option value="base">Base — 142 MB</option>
                    <option value="small">Small — 466 MB (recomendado)</option>
                    <option value="medium">Medium — 1,5 GB, mais preciso e lento</option>
                    <option value="large-v3-turbo">Large v3 Turbo — 1,6 GB</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Idioma da fala</span>
                  <select className="input" value={cfg.language} onChange={(e) => set("language", e.target.value)}>
                    <option value="pt">Português</option>
                    <option value="en">Inglês</option>
                    <option value="es">Espanhol</option>
                    <option value="">Detectar</option>
                  </select>
                </label>
              </div>
              <span className="field-hint">O modelo é baixado uma vez na primeira transcrição.</span>
            </section>

            <section>
              <h3>Imagens geradas por IA</h3>
              <label className="field">
                <span className="field-label">Gerador padrão</span>
                <select className="input" value={cfg.imageProvider} onChange={(e) => set("imageProvider", e.target.value)}>
                  <option value="gemini">Nano Banana (Google Gemini)</option>
                  <option value="openai">GPT Image (OpenAI)</option>
                </select>
                <span className="field-hint">Usado pela edição por prompt e pré-selecionado na aba Gerar com IA. Se o padrão não tiver chave, o editor usa o outro.</span>
              </label>
            </section>

            <section>
              <h3>Nano Banana (Google Gemini)</h3>
              <label className="field">
                <span className="field-label">Chave da API do Gemini</span>
                <input
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder={cfg.hasGeminiKey ? "Cole uma chave nova para trocar" : "Cole a chave do AI Studio"}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
                <KeyStatus has={cfg.hasGeminiKey} masked={cfg.geminiKey} problem={cfg.geminiKeyProblem} onClear={() => clear("geminiKey")} />
                <span className="field-hint">
                  Crie em aistudio.google.com › Get API key. A geração de imagens exige faturamento ativo no projeto do Google.
                </span>
              </label>
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Modelo</span>
                  <select className="input" value={cfg.geminiModel} onChange={(e) => set("geminiModel", e.target.value)}>
                    <option value="gemini-3.1-flash-image">Nano Banana 2</option>
                    <option value="gemini-nano-banana-2.1">Nano Banana 2.1 — mais recente</option>
                    <option value="gemini-3-pro-image">Nano Banana Pro — mais detalhe, mais caro</option>
                    <option value="gemini-3.1-flash-lite-image">Nano Banana 2 Lite — mais barato</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Resolução</span>
                  <select className="input" value={cfg.geminiImageSize} onChange={(e) => set("geminiImageSize", e.target.value)}>
                    <option value="1K">1K — rápida (recomendada)</option>
                    <option value="2K">2K — Full HD com folga</option>
                    <option value="4K">4K — tela cheia em 4K</option>
                  </select>
                </label>
              </div>
              <span className="field-hint">O Gemini não gera fundo transparente; com essa opção marcada, ele cria a imagem sobre fundo branco liso. O Nano Banana 2 Lite só gera em 1K.</span>
            </section>

            <section>
              <h3>GPT Image (OpenAI)</h3>
              <label className="field">
                <span className="field-label">Chave da API da OpenAI</span>
                <input
                  className="input"
                  type="password"
                  autoComplete="off"
                  placeholder={cfg.hasOpenaiKey ? "Cole uma chave nova para trocar" : "sk-…"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                <KeyStatus has={cfg.hasOpenaiKey} masked={cfg.openaiKey} problem={cfg.openaiKeyProblem} onClear={() => clear("openaiKey")} />
              </label>
              <div className="grid-2">
                <label className="field">
                  <span className="field-label">Modelo</span>
                  <select className="input" value={cfg.imageModel} onChange={(e) => set("imageModel", e.target.value)}>
                    <option value="gpt-image-2">gpt-image-2</option>
                    <option value="gpt-image-1.5">gpt-image-1.5</option>
                    <option value="gpt-image-1-mini">gpt-image-1-mini — mais barato</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Qualidade</span>
                  <select className="input" value={cfg.imageQuality} onChange={(e) => set("imageQuality", e.target.value)}>
                    <option value="low">Baixa — mais barata</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </label>
              </div>
            </section>
          </div>
        )}
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={save} disabled={!cfg || saving}>
            {saving ? "Verificando e salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
};
