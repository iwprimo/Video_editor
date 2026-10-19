// Edição por prompt (Claude) e geração de imagens (OpenAI).
import Anthropic from "@anthropic-ai/sdk";
import { askClaudeCode } from "./claudecode.mjs";

const FPS = 30;

export const OPS = [
  "cut",
  "restore",
  "remove_silences",
  "captions",
  "edit_word",
  "add_overlay",
  "update_overlay",
  "remove_overlay",
  "generate_image",
  "add_scene",
  "update_scene",
  "remove_scene",
  "move_scene",
  "add_effect",
  "remove_effect",
  "set_transition",
  "set_project",
];

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Resposta curta em português para o usuário, dizendo o que foi feito ou perguntando o que faltou." },
    operations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: { type: "string", enum: OPS },
          sceneId: { type: "string", description: "Id da cena alvo, ou string vazia" },
          targetId: { type: "string", description: "Id da ilustração alvo, ou string vazia" },
          start: { type: "number", description: "Início em segundos (ver regras), ou -1" },
          end: { type: "number", description: "Fim em segundos (ver regras), ou -1" },
          text: { type: "string", description: "Texto livre da operação, ou string vazia" },
          args: { type: "string", description: "Objeto JSON serializado com os demais parâmetros, ou {}" },
        },
        required: ["op", "sceneId", "targetId", "start", "end", "text", "args"],
        additionalProperties: false,
      },
    },
  },
  required: ["reply", "operations"],
  additionalProperties: false,
};

const SYSTEM = `Você é o assistente de edição de um editor de vídeo (Remotion). O usuário pede mudanças em português e você responde SOMENTE com operações que o editor aplica no projeto. Ele pode desfazer tudo depois.

COMO O PROJETO FUNCIONA
- O vídeo é uma sequência de cenas. Tipos: title, chart, stats, text, outro (cenas geradas) e video (gravação importada).
- Cena de vídeo: o arquivo original tem uma duração; "trechos mantidos" dizem o que fica. Cortar = remover um intervalo. Todos os tempos de cena de vídeo são em SEGUNDOS DO ARQUIVO ORIGINAL, os mesmos da transcrição.
- Nas demais cenas, os tempos são segundos desde o início da cena.
- Ilustrações são sobreposições presas a uma cena, com início (at) e duração.
- Legendas usam a transcrição das cenas de vídeo.

OPERAÇÕES (campos não usados: sceneId/targetId/text = "", start/end = -1, args = "{}")
- cut: sceneId, start, end → remove esse intervalo do vídeo. Para cortar falas, use os tempos da transcrição, começando no início da primeira palavra e terminando no início da palavra seguinte ao trecho.
- restore: sceneId, start, end → devolve um intervalo cortado.
- remove_silences: sceneId; args {"threshold":-35,"minSilence":0.6,"padding":0.15} (dB, segundos). Use valores menores de minSilence (0.3–0.4) para cortes mais agressivos.
- captions: args com qualquer um de {"enabled":true,"style":"highlight|impact|duo|bounce|rise|neon|block|typewriter|karaoke|pop|box|outline|minimal","position":"bottom|middle|top","color":"#rrggbb","size":1,"uppercase":false,"wordsPerPage":5}.
  Estilos de legenda: highlight (fundo colorido na palavra falada, o mais usado em Reels/TikTok), impact (caixa alta grossa com contorno, palavra falada maior), duo (alterna branco e a cor), bounce (palavras entram pulando), rise (surgem de baixo), neon (brilho), block (faixa colorida), typewriter (letras aparecem), karaoke, pop (uma palavra por vez), box (caixa escura), outline (contorno fino), minimal. Para "legenda viral/estilo TikTok", prefira highlight ou impact com 2–3 palavras por vez.
- edit_word: sceneId, start = início exato da palavra na transcrição, text = palavra corrigida (corrige erro de transcrição/legenda).
- add_overlay: sceneId, start = at, end = at + duração; args {"kind":"...","position":"...","size":0.5,"props":{...}}.
- update_overlay: targetId; start/end novos ou -1; args com campos a mudar (position, size, props parciais).
- remove_overlay: targetId.
- generate_image: sceneId, start, end, text = descrição detalhada da imagem em inglês; args {"position":"right","size":0.55,"aspect":"landscape|portrait|square","transparent":false}. Gera com IA e insere como ilustração.
- add_scene: args {"type":"title|chart|stats|text|outro","after":"<id da cena anterior ou vazio para o fim>","fields":{...},"duration":3}. Campos por tipo: title {kicker,title,highlight}; chart {title,subtitle,unit,data:[{label,value}]}; stats {title,stats:[{value,decimals,suffix,label}]}; text {text,author}; outro {brand,tag}.
- update_scene: sceneId; args {"fields":{...},"duration":segundos}. Em cena de vídeo, fields aceita {"fit":"cover|contain","volume":0..1}.
- remove_scene: sceneId. move_scene: sceneId, args {"toIndex":0}.
- add_effect: sceneId (vazio = vídeo inteiro); args {"type":"...","intensity":0.6}. remove_effect: sceneId, args {"type":"..."}.
- set_transition: sceneId (transição para a cena seguinte); args {"type":"cut|fade|slide|wipe|flip|clockWipe|iris|pushCut","direction":"from-left|from-right|from-top|from-bottom","duration":0.6}.
- set_project: args com qualquer um de {"name":"...","format":"landscape|portrait|square","theme":"Noite|Floresta|Papel|Âmbar"}.

TIPOS DE ILUSTRAÇÃO (kind) e props
- image {assetId, animation:"pop|fade|slide|zoom", rounded:true} — só com assetId existente na lista de imagens.
- icon {name: nome de ícone Lucide em inglês kebab-case, ex. "factory","shield-check","trending-up","users","clock","leaf","package","truck","zap","target","award","alert-triangle","check-circle","lightbulb","settings"; label; color:"#rrggbb" ou ""}
- lowerThird {title, subtitle} — nome e cargo de quem fala.
- callout {text} — etiqueta curta.
- keyword {text} — palavra/frase curta grande na tela.
- counter {value, decimals, prefix, suffix, label}
- barChart {title, data:[{label,value}]}
- progress {value 0–100, label}
- checklist {title, items:[...]}
- cta {text}
Posições: full, center, top, bottom, left, right, top-left, top-right, bottom-left, bottom-right. size: 0.15–1. Durações típicas 2–6 s.

EFEITOS: zoomIn, zoomOut, pan, shake, pop, blurIn, bw, vintage, cinema, vivid, vignette, grain, scanlines, leak, letterbox, flash, glitch.

REGRAS
- Use apenas ids que existem no contexto. Não invente assetId.
- "Aqui", "agora", "neste ponto" = posição atual do cursor informada no contexto.
- Ao inserir ilustrações sobre falas, alinhe o início com a palavra correspondente da transcrição e evite sobrepor ilustrações na mesma posição.
- Ilustrações com números/textos devem refletir o que é dito na fala.
- Se faltar informação essencial (ex.: não há vídeo importado, ou não há transcrição para cortar por fala), não invente: explique em reply e devolva operations vazia.
- reply: 1–3 frases, em português, sem markdown.`;

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(2);

// Resumo compacto do projeto para o modelo
export const buildContext = (project, { playhead, selection }) => {
  const lines = [];
  lines.push(`Projeto "${project.name}", formato ${project.format}.`);
  const fx = (list) => (list?.length ? list.map((e) => `${e.type} ${Math.round(e.intensity * 100)}%`).join(", ") : "nenhum");
  lines.push(`Efeitos do vídeo inteiro: ${fx(project.effects)}.`);
  lines.push("", "CENAS (na ordem):");
  project.scenes.forEach((s, i) => {
    const tr = s.transition && s.transition.type !== "cut" ? `${s.transition.type} ${fmt(s.transition.duration / FPS)}s` : "corte seco";
    const base = `${i + 1}. id=${s.id} tipo=${s.type} duração=${fmt(s.duration / FPS)}s efeitos: ${fx(s.effects)}; transição para a próxima: ${tr}`;
    if (s.type !== "video") {
      const { id, type, duration, effects, transition, ...fields } = s;
      lines.push(`${base}; campos: ${JSON.stringify(fields)}`);
      return;
    }
    lines.push(`${base}; arquivo "${s.name}", original ${fmt(s.srcDuration)}s; fit=${s.fit}; volume=${s.volume}`);
    lines.push(`   Trechos mantidos (s do original): ${s.segments.map((g) => `${fmt(g.start)}–${fmt(g.end)}`).join(", ")}`);
    if (!s.words?.length) {
      lines.push("   Sem transcrição ainda.");
      return;
    }
    lines.push("   Transcrição (s do original; trechos entre ⟦ ⟧ estão cortados):");
    const inKept = (t) => s.segments.some((g) => t >= g.start && t <= g.end);
    let chunk = [];
    const flush = () => {
      if (!chunk.length) return;
      let text = "";
      let cutOpen = false;
      for (const w of chunk) {
        const cut = !inKept((w.start + w.end) / 2);
        if (cut && !cutOpen) {
          text += " ⟦";
          cutOpen = true;
        }
        if (!cut && cutOpen) {
          text += "⟧";
          cutOpen = false;
        }
        text += ` ${w.text}@${fmt(w.start)}`;
      }
      if (cutOpen) text += "⟧";
      lines.push(`   [${fmt(chunk[0].start)}–${fmt(chunk[chunk.length - 1].end)}]${text}`);
      chunk = [];
    };
    s.words.forEach((w, j) => {
      const prev = s.words[j - 1];
      if (prev && (w.start - prev.end > 0.7 || chunk.length >= 14)) flush();
      chunk.push(w);
    });
    flush();
  });
  lines.push("", "ILUSTRAÇÕES:");
  if (!project.overlays?.length) lines.push("nenhuma");
  for (const o of project.overlays ?? []) {
    lines.push(`- id=${o.id} cena=${o.sceneId} at=${fmt(o.at)}s dur=${fmt(o.duration)}s kind=${o.kind} pos=${o.position} size=${o.size} props=${JSON.stringify(o.props)}`);
  }
  const c = project.captions;
  lines.push("", `LEGENDAS: ${c?.enabled ? `ativadas, estilo ${c.style}, posição ${c.position}, cor ${c.color}` : "desativadas"}.`);
  lines.push("", "IMAGENS DISPONÍVEIS:");
  if (!project.assets?.length) lines.push("nenhuma");
  for (const a of project.assets ?? []) lines.push(`- assetId=${a.id} "${a.name}"${a.generated ? " (gerada por IA)" : ""} ${a.width}x${a.height}`);
  if (playhead) lines.push("", `CURSOR: cena ${playhead.sceneId}, ${fmt(playhead.at)}s ${playhead.isVideo ? "do original" : "desde o início da cena"}.`);
  if (selection) lines.push(`SELECIONADO: ${selection}.`);
  return lines.join("\n");
};

// Mensagem clara para chave recusada pela Anthropic
const anthropicAuthError = () =>
  Object.assign(
    new Error(
      "A Anthropic recusou a chave salva (invalid x-api-key). Abra a engrenagem › Configurações e cole a chave secreta que começa com sk-ant-, criada em platform.claude.com › API Keys.",
    ),
    { status: 401 },
  );

const apiError = (e) => {
  if (e?.status === 401) throw anthropicAuthError();
  if (e?.status === 400 && /credit balance/i.test(e?.message ?? ""))
    throw Object.assign(
      new Error(
        "A chave está certa, mas a conta da API está sem créditos. Compre créditos em platform.claude.com › Billing ou, nas Configurações, troque para \"Minha assinatura\" (Claude Code).",
      ),
      { status: 402 },
    );
  throw e;
};

// Pedido com resposta JSON, pela assinatura (Claude Code) ou pela API, conforme as Configurações
export const askJson = async ({ config, system, user, schema, maxTokens = 8000, effort = "low" }) => {
  if (config.promptProvider === "claude-code") {
    const { data } = await askClaudeCode({
      system: `${system}\n\nFORMATO: responda somente com um objeto JSON neste esquema, sem texto antes ou depois:\n${JSON.stringify(schema)}`,
      user,
      schema,
      effort,
      model: config.anthropicModel || "claude-sonnet-5-5",
      customPath: config.claudeCodePath,
    });
    return data;
  }
  if (!config.anthropicKey) {
    throw Object.assign(new Error("Configure o acesso ao Claude em Configurações (sua assinatura ou uma chave de API)."), { status: 400 });
  }
  const client = new Anthropic({ apiKey: config.anthropicKey });
  const response = await client.messages
    .create({
      model: config.anthropicModel || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort, format: { type: "json_schema", schema } },
    })
    .catch(apiError);
  if (response.stop_reason === "refusal") throw new Error("O pedido foi recusado pelo modelo.");
  const block = response.content.find((b) => b.type === "text");
  if (!block) throw new Error("Resposta vazia do modelo.");
  return JSON.parse(block.text);
};

// ---------- Correção de transcrição ----------

const FIX_SCHEMA = {
  type: "object",
  properties: { text: { type: "string", description: "O mesmo trecho, corrigido, com as palavras separadas por espaço" } },
  required: ["text"],
  additionalProperties: false,
};

const FIX_SYSTEM = `Você revisa transcrições automáticas de fala (Whisper) que viram legendas de vídeo.
Recebe um trecho e devolve o MESMO trecho corrigido.

CORRIJA
- palavras mal reconhecidas, usando o contexto (ex.: palavras que soam parecido, termos técnicos, siglas);
- ortografia e acentuação;
- palavras partidas ou grudadas por engano ("aldo esterona" → "aldosterona");
- nomes próprios, marcas e termos da lista de termos, quando houver;
- pontuação e maiúsculas, para a legenda ficar fácil de ler.

NÃO FAÇA
- não resuma, não reescreva com outras palavras, não mude a ordem, não traduza;
- não acrescente conteúdo que não foi dito; não remova trechos;
- mantenha gírias, repetições e vícios de linguagem do jeito que foram falados (a legenda acompanha a fala);
- números: escreva do jeito mais natural para legenda (ex.: "10%", "2024"), sem mudar o valor dito.

Se o trecho já estiver certo, devolva igual.`;

// Divide as palavras em blocos de ~maxWords, cortando de preferência em fim de frase ou pausa longa
const chunkWords = (words, maxWords = 320) => {
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    let end = Math.min(words.length, start + maxWords);
    if (end < words.length) {
      let best = -1;
      for (let i = end - 1; i > start + maxWords * 0.6; i--) {
        const gap = (words[i + 1]?.start ?? 0) - (words[i].end ?? 0);
        if (/[.!?…]$/.test(words[i].text) || gap > 0.8) {
          best = i + 1;
          break;
        }
      }
      if (best > 0) end = best;
    }
    chunks.push({ from: start, to: end });
    start = end;
  }
  return chunks;
};

export const fixTranscript = async ({ config, words, glossary = "", language = "pt", onProgress }) => {
  const chunks = chunkWords(words);
  const results = new Array(chunks.length);
  let done = 0;
  let next = 0;
  const lang = language === "en" ? "inglês" : language === "es" ? "espanhol" : "português do Brasil";
  const worker = async () => {
    while (next < chunks.length) {
      const k = next++;
      const c = chunks[k];
      const before = k > 0 ? words.slice(Math.max(0, c.from - 25), c.from).map((w) => w.text).join(" ") : "";
      const user = [
        `Idioma da fala: ${lang}.`,
        glossary.trim() ? `TERMOS E NOMES CORRETOS (use esta grafia):\n${glossary.trim()}` : "",
        before ? `CONTEXTO ANTERIOR (só para entender, não devolva):\n${before}` : "",
        `TRECHO PARA CORRIGIR:\n${words.slice(c.from, c.to).map((w) => w.text).join(" ")}`,
      ]
        .filter(Boolean)
        .join("\n\n");
      const data = await askJson({ config, system: FIX_SYSTEM, user, schema: FIX_SCHEMA, maxTokens: 8000, effort: "low" });
      results[k] = { from: c.from, to: c.to, text: String(data?.text ?? "") };
      done++;
      onProgress?.(done / chunks.length, `Corrigindo trecho ${done} de ${chunks.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, chunks.length) }, worker));
  return results;
};

// Testa a chave com uma chamada leve (lista de modelos). Erro de rede não impede salvar.
export const verifyAnthropicKey = async (apiKey) => {
  try {
    await new Anthropic({ apiKey, timeout: 15000, maxRetries: 0 }).models.list({ limit: 1 });
    return { ok: true };
  } catch (e) {
    if (e?.status === 401 || e?.status === 403)
      return { ok: false, error: "A Anthropic recusou essa chave. Confira se copiou a chave inteira (começa com sk-ant-) e se ela não foi desativada no console." };
    return { ok: true, unverified: true };
  }
};

export const runPrompt = async ({ config, project, message, history, playhead, selection }) => {
  const { anthropicKey, anthropicModel } = config;
  if (config.promptProvider === "claude-code") return runPromptClaudeCode({ config, project, message, history, playhead, selection });
  if (!anthropicKey) {
    const err = new Error("Configure a chave da API da Claude em Configurações para editar por prompt.");
    err.status = 400;
    throw err;
  }
  const client = new Anthropic({ apiKey: anthropicKey });
  const context = buildContext(project, { playhead, selection });
  const past = (history ?? []).slice(-6).flatMap((h) => [
    { role: "user", content: h.message },
    { role: "assistant", content: JSON.stringify({ reply: h.reply, operations: [] }) },
  ]);
  const response = await client.messages
    .create({
    model: anthropicModel || "claude-sonnet-5-5",
    max_tokens: 16000,
    system: SYSTEM,
    messages: [...past, { role: "user", content: `CONTEXTO ATUAL DO PROJETO\n${context}\n\nPEDIDO DO USUÁRIO\n${message}` }],
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    })
    .catch(apiError);
  if (response.stop_reason === "refusal") throw new Error("O pedido foi recusado pelo modelo.");
  const block = response.content.find((b) => b.type === "text");
  if (!block) throw new Error("Resposta vazia do modelo.");
  return { ...toResult(JSON.parse(block.text)), usage: response.usage };
};

// Mesmo pedido, feito pelo Claude Code com a assinatura do usuário
const runPromptClaudeCode = async ({ config, project, message, history, playhead, selection }) => {
  const context = buildContext(project, { playhead, selection });
  const past = (history ?? []).slice(-6);
  const user = [
    past.length ? "CONVERSA RECENTE" : "",
    ...past.flatMap((h) => [`Usuário: ${h.message}`, `Assistente: ${h.reply}`]),
    past.length ? "" : "",
    "CONTEXTO ATUAL DO PROJETO",
    context,
    "",
    "PEDIDO DO USUÁRIO",
    message,
  ]
    .filter((l, i) => l !== "" || i > 0)
    .join("\n");
  const system = `${SYSTEM}\n\nFORMATO: responda somente com um objeto JSON neste esquema, sem texto antes ou depois:\n${JSON.stringify(SCHEMA)}\nNão use ferramentas: tudo o que você precisa está na mensagem.`;
  const { data, meta } = await askClaudeCode({
    system,
    user,
    schema: SCHEMA,
    model: config.anthropicModel || "claude-sonnet-5-5",
    customPath: config.claudeCodePath,
  });
  return { ...toResult(data), usage: meta?.usage, via: "claude-code" };
};

const toResult = (data) => {
  const operations = (data.operations ?? [])
    .filter((o) => OPS.includes(o.op))
    .map((o) => {
      let args = {};
      try {
        args = o.args ? JSON.parse(o.args) : {};
      } catch {
        args = {};
      }
      return { ...o, args };
    });
  return { reply: data.reply ?? "", operations };
};

// ---------- Geração de imagem ----------

const keyError = (msg) => Object.assign(new Error(msg), { status: 400 });

// Dimensões reais lidas do cabeçalho do arquivo (PNG, JPEG ou WebP)
export const imageDimensions = (buf) => {
  try {
    if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) {
          i++;
          continue;
        }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        }
        i += 2 + len;
      }
    }
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      const chunk = buf.toString("ascii", 12, 16);
      if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      if (chunk === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
    }
  } catch {
    /* cabeçalho inesperado */
  }
  return null;
};

const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

// Qual provedor usar: o pedido, depois o padrão das configurações, depois o que tiver chave
export const resolveProvider = (config, requested) => {
  const has = { gemini: !!config.geminiKey, openai: !!config.openaiKey };
  if (requested === "gemini" || requested === "openai") return requested;
  const preferred = config.imageProvider === "openai" ? "openai" : "gemini";
  if (has[preferred]) return preferred;
  if (has.gemini) return "gemini";
  if (has.openai) return "openai";
  return preferred;
};

// ----- OpenAI (gpt-image) -----

const OPENAI_SIZES = { landscape: "1536x1024", portrait: "1024x1536", square: "1024x1024" };

const generateOpenAI = async ({ config, prompt, aspect, transparent }) => {
  if (!config.openaiKey) throw keyError("Configure a chave da OpenAI em Configurações para gerar imagens com o GPT Image.");
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openaiKey}` },
    body: JSON.stringify({
      model: config.imageModel || "gpt-image-2",
      prompt,
      size: OPENAI_SIZES[aspect] ?? OPENAI_SIZES.landscape,
      quality: config.imageQuality || "medium",
      output_format: "png",
      background: transparent ? "transparent" : "auto",
      n: 1,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Erro ${res.status} ao gerar a imagem na OpenAI`);
    err.status = res.status;
    throw err;
  }
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("A OpenAI não devolveu a imagem.");
  return { buffer: Buffer.from(b64, "base64"), mimeType: "image/png" };
};

// ----- Google Gemini (Nano Banana) -----

// Pode ser trocado para testes ou proxies corporativos
const GEMINI_BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const GEMINI_RATIOS = { landscape: "16:9", portrait: "9:16", square: "1:1" };

const geminiError = (status, json) => {
  const msg = json?.error?.message || `Erro ${status} ao gerar a imagem no Gemini`;
  const err = new Error(
    status === 400 && /api key/i.test(msg)
      ? "A chave da API do Gemini foi recusada. Confira em Configurações."
      : status === 429
        ? "Limite de uso do Gemini atingido. Aguarde um pouco ou confira o plano/faturamento no Google AI Studio."
        : msg,
  );
  err.status = status;
  return err;
};

// Procura a primeira imagem em qualquer formato de resposta conhecido
const findGeminiImage = (json) => {
  for (const step of json?.steps ?? []) {
    for (const c of step?.content ?? []) {
      if (c?.type === "image" && c.data) return { data: c.data, mimeType: c.mime_type || c.mimeType || "image/png" };
    }
  }
  for (const out of json?.outputs ?? []) {
    if (out?.type === "image" && out.data) return { data: out.data, mimeType: out.mime_type || "image/png" };
  }
  for (const cand of json?.candidates ?? []) {
    for (const part of cand?.content?.parts ?? []) {
      const inline = part?.inlineData || part?.inline_data;
      if (inline?.data) return { data: inline.data, mimeType: inline.mimeType || inline.mime_type || "image/png" };
    }
  }
  return null;
};

const geminiText = (json) => {
  const texts = [];
  for (const step of json?.steps ?? []) for (const c of step?.content ?? []) if (c?.type === "text" && c.text) texts.push(c.text);
  for (const cand of json?.candidates ?? []) for (const part of cand?.content?.parts ?? []) if (part?.text) texts.push(part.text);
  return texts.join(" ").trim();
};

const generateGemini = async ({ config, prompt, aspect, transparent }) => {
  if (!config.geminiKey) throw keyError("Configure a chave da API do Gemini em Configurações para gerar imagens com o Nano Banana.");
  const model = config.geminiModel || "gemini-3.1-flash-image";
  // O Gemini não gera fundo transparente: pede fundo liso para facilitar recortar depois
  const text = transparent ? `${prompt}. Isolated subject on a plain solid white background, no shadows on the background.` : prompt;
  const aspectRatio = GEMINI_RATIOS[aspect] ?? GEMINI_RATIOS.landscape;
  const imageSize = ["512", "1K", "2K", "4K"].includes(config.geminiImageSize) ? config.geminiImageSize : "1K";
  const headers = { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey };

  // 1) Interactions API (formato atual da documentação)
  const res = await fetch(`${GEMINI_BASE}/v1beta/interactions`, {
    method: "POST",
    headers: { ...headers, "Api-Revision": "2026-05-20" },
    body: JSON.stringify({
      model,
      input: [{ type: "text", text }],
      response_format: { type: "image", mime_type: "image/png", aspect_ratio: aspectRatio, image_size: imageSize },
    }),
  });
  let json = await res.json().catch(() => ({}));

  // 2) generateContent, caso a conta ou região ainda não tenha a Interactions API
  if (!res.ok && [400, 404, 405].includes(res.status) && !/api key/i.test(json?.error?.message ?? "")) {
    const legacy = await fetch(`${GEMINI_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio, imageSize } },
      }),
    });
    const legacyJson = await legacy.json().catch(() => ({}));
    if (!legacy.ok) throw geminiError(res.status === 404 ? legacy.status : res.status, res.status === 404 ? legacyJson : json);
    json = legacyJson;
  } else if (!res.ok) {
    throw geminiError(res.status, json);
  }

  const img = findGeminiImage(json);
  if (!img) {
    const why = geminiText(json);
    throw new Error(why ? `O Gemini não gerou a imagem: ${why.slice(0, 220)}` : "O Gemini não devolveu a imagem. Tente descrever de outro jeito.");
  }
  return { buffer: Buffer.from(img.data, "base64"), mimeType: img.mimeType };
};

export const IMAGE_PROVIDERS = { gemini: "Nano Banana (Gemini)", openai: "GPT Image (OpenAI)" };

export const generateImage = async ({ config, prompt, aspect = "landscape", transparent = false, provider }) => {
  const which = resolveProvider(config, provider);
  const out = which === "openai" ? await generateOpenAI({ config, prompt, aspect, transparent }) : await generateGemini({ config, prompt, aspect, transparent });
  const dims = imageDimensions(out.buffer) ?? { width: 1024, height: 1024 };
  return { ...out, ...dims, ext: EXT[out.mimeType] ?? "png", provider: which };
};

// ---------- Unified AI JSON (Claude / Gemini) ----------

export const askGeminiJson = async ({ config, system, user, schema }) => {
  if (!config.geminiKey) throw new Error("Chave da API do Gemini não configurada.");
  const model = "gemini-2.5-flash";
  const headers = { "Content-Type": "application/json", "x-goog-api-key": config.geminiKey };
  const promptText = `${system}\n\n${user}\n\nFORMATO DE SAÍDA OBRIGATÓRIO: Responda estritamente com um JSON válido conforme o esquema:\n${JSON.stringify(schema)}`;

  let res = await fetch(`${GEMINI_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  let json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallbackRes = await fetch(`${GEMINI_BASE}/v1beta/models/gemini-1.5-flash:generateContent`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    json = await fallbackRes.json().catch(() => ({}));
    if (!fallbackRes.ok) throw geminiError(fallbackRes.status, json);
  }
  const text = geminiText(json);
  if (!text) throw new Error("O Gemini não retornou texto.");
  try {
    return JSON.parse(text);
  } catch {
    const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    return JSON.parse(clean);
  }
};

export const askAiJson = async ({ config, system, user, schema, maxTokens = 8000, effort = "low" }) => {
  if (config.promptProvider === "claude-code" || config.anthropicKey) {
    try {
      return await askJson({ config, system, user, schema, maxTokens, effort });
    } catch (e) {
      if (config.geminiKey) {
        console.warn("Claude indisponível, usando Gemini:", e.message);
        return await askGeminiJson({ config, system, user, schema });
      }
      throw e;
    }
  }
  if (config.geminiKey) {
    return await askGeminiJson({ config, system, user, schema });
  }
  throw Object.assign(
    new Error("Configure o acesso ao Claude ou a chave da API do Gemini em Configurações para utilizar este recurso de IA."),
    { status: 400 }
  );
};

// ---------- Extrator de Melhores Momentos (Opus Clip Local) ----------

const HIGHLIGHTS_SCHEMA = {
  type: "object",
  properties: {
    highlights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string", description: "Título magnético estilo TikTok/Reels com alto CTR" },
          score: { type: "integer", description: "Score de viralidade estimado de 0 a 100" },
          hook: { type: "string", description: "Explicação em 1 frase de por que este momento gera retenção" },
          start: { type: "number", description: "Timestamp de início em segundos" },
          end: { type: "number", description: "Timestamp de fim em segundos" },
          summary: { type: "string", description: "Resumo do que é falado neste trecho" },
        },
        required: ["id", "title", "score", "hook", "start", "end", "summary"],
        additionalProperties: false,
      },
    },
  },
  required: ["highlights"],
  additionalProperties: false,
};

const HIGHLIGHTS_SYSTEM = `Você é um especialista mundial em edição de vídeos curtos virais (estilo Opus Clip, Alex Hormozi e MrBeast).
Sua missão é analisar a transcrição com timestamps de um vídeo e identificar os 3 a 5 MELHORES MOMENTOS para transformar em Shorts / Reels / TikToks autossuficientes.

CRITÉRIOS DE SELEÇÃO:
1. Gancho forte nos primeiros 3 segundos do trecho (pergunta instigante, revelação chocante, contradição, conselho direto).
2. O trecho DEVE ter sentido completo e coerência (início, meio e conclusão ou punchline).
3. Duração ideal entre 20 e 60 segundos por momento.
4. Timestamps precisos: 'start' no início exato da primeira palavra do gancho e 'end' no fim da fala conclusiva.
5. Score de viralidade (0 a 100) baseado no potencial de retenção e compartilhamento.`;

export const extractHighlights = async ({ config, words = [], title = "" }) => {
  if (!words.length) throw new Error("A transcrição do vídeo é necessária para extrair os melhores momentos.");
  const transcriptLines = [];
  let line = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    line.push(w.text);
    if (line.length >= 10 || i === words.length - 1) {
      const first = words[i - line.length + 1];
      transcriptLines.push(`[${first.start.toFixed(1)}s - ${w.end.toFixed(1)}s] ${line.join(" ")}`);
      line = [];
    }
  }
  const user = `TÍTULO DO VÍDEO: ${title || "Vídeo sem título"}\n\nTRANSCRIÇÃO COM TIMESTAMPS:\n${transcriptLines.join("\n")}`;
  const res = await askAiJson({ config, system: HIGHLIGHTS_SYSTEM, user, schema: HIGHLIGHTS_SCHEMA });
  return res.highlights || [];
};

// ---------- Gerador de Copy & SEO para Redes Sociais ----------

const SOCIAL_COPY_SCHEMA = {
  type: "object",
  properties: {
    tiktok: {
      type: "object",
      properties: {
        hook: { type: "string", description: "Frase de impacto de 3 segundos para sobrepor na tela" },
        caption: { type: "string", description: "Legenda curta, persuasiva e direta" },
        hashtags: { type: "array", items: { type: "string" }, description: "5 a 8 hashtags virais e do nicho" },
      },
      required: ["hook", "caption", "hashtags"],
      additionalProperties: false,
    },
    instagram: {
      type: "object",
      properties: {
        hook: { type: "string", description: "Linha 1 do post para prender o scroll no feed" },
        caption: { type: "string", description: "Texto completo com quebras de linha e boa legibilidade" },
        cta: { type: "string", description: "Chamada para ação clara (salvar, comentar, seguir)" },
        hashtags: { type: "array", items: { type: "string" }, description: "Hashtags segmentadas" },
      },
      required: ["hook", "caption", "cta", "hashtags"],
      additionalProperties: false,
    },
    youtube: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título irresistível com alto CTR (menos de 70 caracteres)" },
        description: { type: "string", description: "Descrição otimizada para SEO e busca do YouTube" },
        tags: { type: "array", items: { type: "string" }, description: "Lista de tags de busca do YouTube" },
      },
      required: ["title", "description", "tags"],
      additionalProperties: false,
    },
  },
  required: ["tiktok", "instagram", "youtube"],
  additionalProperties: false,
};

const SOCIAL_COPY_SYSTEM = `Você é um copywriter sênior especialista em distribuição e viralização de vídeos para TikTok, Instagram Reels e YouTube Shorts.
Com base no tema ou na transcrição do vídeo, você gera posts e copys altamente magnéticas e otimizadas para o algoritmo de cada plataforma.
Escreva de forma persuasiva, com ganchos fortes e excelente formatação.`;

export const generateSocialCopy = async ({ config, words = [], title = "", tone = "viral" }) => {
  const textSummary = words.length ? words.map((w) => w.text).join(" ").slice(0, 4000) : title;
  if (!textSummary) throw new Error("Forneça a transcrição ou o título do projeto para gerar as copys.");
  const user = `TÍTULO: ${title}\nTOM DE VOZ: ${tone}\n\nCONTEÚDO/TRANSCRIÇÃO:\n${textSummary}`;
  return await askAiJson({ config, system: SOCIAL_COPY_SYSTEM, user, schema: SOCIAL_COPY_SCHEMA });
};

// ---------- Sugestões de B-Roll da Transcrição ----------

const BROLL_SUGGEST_SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "Palavra-chave visual em português" },
          englishKeyword: { type: "string", description: "Termo de busca em inglês para o Pexels" },
          start: { type: "number", description: "Timestamp inicial sugerido em segundos" },
          end: { type: "number", description: "Timestamp final sugerido em segundos" },
          reason: { type: "string", description: "Justificativa da cena" },
        },
        required: ["keyword", "englishKeyword", "start", "end", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
};

const BROLL_SUGGEST_SYSTEM = `Você é um diretor de arte e editor de retenção visual para YouTube Shorts e TikTok.
Analise a transcrição com timestamps e sugira de 3 a 6 inserções estratégicas de B-Roll (vídeos de apoio) para ilustrar os conceitos falados e dinamizar o vídeo.
Forneça a palavra-chave em português e o termo em inglês mais eficaz para encontrar clipes relevantes no Pexels.`;

export const suggestBrolls = async ({ config, words = [], title = "" }) => {
  if (!words.length) throw new Error("A transcrição do vídeo é necessária para sugerir B-Rolls.");
  const transcriptLines = [];
  let line = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    line.push(w.text);
    if (line.length >= 10 || i === words.length - 1) {
      const first = words[i - line.length + 1];
      transcriptLines.push(`[${first.start.toFixed(1)}s - ${w.end.toFixed(1)}s] ${line.join(" ")}`);
      line = [];
    }
  }
  const user = `TÍTULO: ${title}\n\nTRANSCRIÇÃO COM TIMESTAMPS:\n${transcriptLines.join("\n")}`;
  const res = await askAiJson({ config, system: BROLL_SUGGEST_SYSTEM, user, schema: BROLL_SUGGEST_SCHEMA });
  return res.suggestions || [];
};
