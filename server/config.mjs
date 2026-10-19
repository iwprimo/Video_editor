// Configurações locais (chaves de API e modelos), guardadas em config.json na pasta do projeto.
// As chaves nunca voltam completas para o navegador.
import fs from "node:fs";
import path from "node:path";

export const DEFAULTS = {
  anthropicKey: "",
  anthropicModel: "claude-sonnet-5-5",
  promptProvider: "api",
  claudeCodePath: "",
  openaiKey: "",
  imageModel: "gpt-image-2",
  imageQuality: "medium",
  geminiKey: "",
  geminiModel: "gemini-3.1-flash-image",
  geminiImageSize: "1K",
  imageProvider: "gemini",
  whisperModel: "small",
  language: "pt",
};

const KEYS = ["anthropicKey", "openaiKey", "geminiKey"];

// Confere o formato da chave antes de salvar. Devolve a mensagem do problema, ou null.
export const keyProblem = (k, v) => {
  if (!v) return null;
  if (/\s/.test(v)) return "A chave tem espaços ou quebras de linha no meio. Copie de novo, só a chave.";
  if (k === "anthropicKey") {
    if (/^apikey_/i.test(v))
      return "Isso é o ID da chave (apikey_…), não a chave. Em platform.claude.com › API Keys, crie uma chave nova e copie o valor que começa com sk-ant- — ele só aparece uma vez, na criação.";
    if (!v.startsWith("sk-ant-")) return "A chave da Anthropic começa com sk-ant-. Confira se copiou a chave inteira.";
  }
  if (k === "openaiKey" && !v.startsWith("sk-")) return "A chave da OpenAI começa com sk-. Confira se copiou a chave inteira.";
  return null;
};

const ENV = { anthropicKey: "ANTHROPIC_API_KEY", openaiKey: "OPENAI_API_KEY", geminiKey: "GEMINI_API_KEY" };

export const createConfig = (root) => {
  const file = path.join(root, "config.json");
  let data = { ...DEFAULTS };
  try {
    data = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    /* primeira execução */
  }
  // A chave salva no editor vale primeiro; a variável de ambiente só entra se não houver chave salva
  // (antes era o contrário, e uma variável antiga do Windows anulava a chave colada no editor)
  const fromEnv = new Set();
  for (const [k, env] of Object.entries(ENV)) {
    const v = process.env[env]?.trim();
    if (!data[k] && v) {
      data[k] = v;
      fromEnv.add(k);
    }
  }
  const write = () => {
    const out = { ...data };
    for (const k of fromEnv) out[k] = "";
    fs.writeFileSync(file, JSON.stringify(out, null, 2));
  };

  const mask = (k) => (k ? `${k.slice(0, 7)}…${k.slice(-4)}` : "");

  return {
    get: () => data,
    public: () => ({
      anthropicKey: mask(data.anthropicKey),
      hasAnthropicKey: !!data.anthropicKey,
      anthropicKeyProblem: keyProblem("anthropicKey", data.anthropicKey),
      anthropicKeyFromEnv: fromEnv.has("anthropicKey"),
      anthropicModel: data.anthropicModel,
      promptProvider: data.promptProvider === "claude-code" ? "claude-code" : "api",
      claudeCodePath: data.claudeCodePath,
      openaiKey: mask(data.openaiKey),
      hasOpenaiKey: !!data.openaiKey,
      openaiKeyProblem: keyProblem("openaiKey", data.openaiKey),
      imageModel: data.imageModel,
      imageQuality: data.imageQuality,
      geminiKey: mask(data.geminiKey),
      hasGeminiKey: !!data.geminiKey,
      geminiKeyProblem: keyProblem("geminiKey", data.geminiKey),
      geminiModel: data.geminiModel,
      geminiImageSize: data.geminiImageSize,
      imageProvider: data.imageProvider,
      whisperModel: data.whisperModel,
      language: data.language,
    }),
    // Chaves novas que vieram no pedido (já sem espaços nas pontas), sem as vazias/mascaradas
    newKeys: (patch) => {
      const out = {};
      for (const k of KEYS) {
        const v = typeof patch?.[k] === "string" ? patch[k].trim().replace(/^["']|["']$/g, "") : "";
        if (v && !v.includes("…")) out[k] = v;
      }
      return out;
    },
    update: (patch) => {
      const next = { ...data };
      for (const [k, raw] of Object.entries(patch ?? {})) {
        if (!(k in DEFAULTS) || typeof raw !== "string") continue;
        let v = raw.trim();
        if (KEYS.includes(k)) {
          v = v.replace(/^["']|["']$/g, "");
          // Campo de chave vazio ou mascarado não sobrescreve a chave salva
          if (v === "" || v.includes("…")) continue;
          const problem = keyProblem(k, v);
          if (problem) throw Object.assign(new Error(problem), { status: 400 });
          fromEnv.delete(k);
        }
        next[k] = v;
      }
      data = next;
      write();
      return data;
    },
    clearKey: (k) => {
      if (KEYS.includes(k)) {
        data[k] = "";
        fromEnv.delete(k);
        write();
      }
    },
  };
};
