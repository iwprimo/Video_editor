// Servidor local do editor: exportação, mídia (upload, conversão, silêncios),
// transcrição (Whisper), edição por prompt (Claude) e geração de imagens.
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import { createConfig } from "./config.mjs";
import { probe, needsTranscode, transcode, detectSilences, safeName } from "./media.mjs";
import { transcribeFile } from "./whisper.mjs";
import { runPrompt, generateImage, verifyAnthropicKey, fixTranscript, extractHighlights, generateSocialCopy, suggestBrolls } from "./ai.mjs";
import { claudeCodeStatus } from "./claudecode.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "exportados");
const mediaDir = path.join(root, "midia");
const originalsDir = path.join(mediaDir, "originais");
const entry = path.join(root, "src", "remotion", "index.ts");
const PORT = Number(process.env.PORT ?? 3123);
const MEDIA_BASE = `http://localhost:${PORT}`;
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

for (const d of [outDir, mediaDir, originalsDir]) fs.mkdirSync(d, { recursive: true });

const config = createConfig(root);
const app = express();
app.use(express.json({ limit: "25mb" }));
app.use("/media", express.static(mediaDir, { acceptRanges: true, maxAge: "1h" }));

const upload = multer({
  storage: multer.diskStorage({
    destination: originalsDir,
    filename: (_req, file, cb) => cb(null, `${Date.now().toString(36)}-${safeName(file.originalname)}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 * 1024 },
});

// ---------- Tarefas em segundo plano ----------

/** @type {Map<string, {status: string, progress: number, stage: string, result?: unknown, error?: string, file?: string, path?: string}>} */
const jobs = new Map();
const newJob = (stage = "Na fila") => {
  const id = Math.random().toString(36).slice(2, 10);
  jobs.set(id, { status: "running", progress: 0, stage });
  return [id, jobs.get(id)];
};
const fail = (job, e) => {
  console.error(e);
  Object.assign(job, { status: "error", error: e instanceof Error ? e.message : String(e) });
};

app.get("/api/jobs/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ status: "error", error: "Tarefa não encontrada" });
  const { path: _p, ...pub } = job;
  res.json(pub);
});

const mediaPath = (file) => {
  const base = path.basename(String(file ?? ""));
  const p = path.join(mediaDir, base);
  if (fs.existsSync(p)) return p;
  const inOrig = path.join(originalsDir, base);
  if (fs.existsSync(inOrig)) return inOrig;
  throw Object.assign(new Error(`Arquivo de mídia não encontrado: ${base}`), { status: 404 });
};

// ---------- Configurações ----------

app.get("/api/config", (_req, res) => res.json(config.public()));
app.post("/api/config", async (req, res) => {
  try {
    const fresh = config.newKeys(req.body);
    if (fresh.anthropicKey && !/^apikey_/i.test(fresh.anthropicKey) && fresh.anthropicKey.startsWith("sk-ant-")) {
      const check = await verifyAnthropicKey(fresh.anthropicKey);
      if (!check.ok) return res.status(400).json({ error: check.error });
    }
    config.update(req.body);
    res.json(config.public());
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
});
app.get("/api/claude-code/status", async (req, res) => {
  try {
    const custom = typeof req.query.path === "string" ? req.query.path : config.get().claudeCodePath;
    res.json(await claudeCodeStatus(custom));
  } catch (e) {
    res.status(500).json({ found: false, message: e.message });
  }
});
app.post("/api/config/clear", (req, res) => {
  config.clearKey(req.body?.key);
  res.json(config.public());
});

// ---------- Upload de mídia ----------

app.post("/api/media", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo recebido" });
  const original = req.file.path;
  const isImage = /^image\//.test(req.file.mimetype) || /\.(png|jpe?g|webp|gif|svg)$/i.test(req.file.originalname);
  const isAudio = /^audio\//.test(req.file.mimetype) || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(req.file.originalname);

  if (isImage) {
    const file = path.basename(original);
    fs.renameSync(original, path.join(mediaDir, file));
    return res.json({ kind: "image", file, name: req.file.originalname });
  }

  if (isAudio) {
    const file = path.basename(original);
    fs.renameSync(original, path.join(mediaDir, file));
    let duration = 0;
    try {
      const info = await probe(path.join(mediaDir, file));
      duration = info.duration || 0;
    } catch {
      /* probe fallback */
    }
    return res.json({ kind: "audio", file, name: req.file.originalname, duration });
  }

  const [id, job] = newJob("Analisando o vídeo");
  res.json({ kind: "video", jobId: id });
  try {
    const info = await probe(original);
    if (!info.videoCodec) throw new Error("O arquivo não tem uma faixa de vídeo reconhecível.");
    const base = path.basename(original).replace(/\.[^.]+$/, "");
    let file = `${base}.mp4`;
    if (needsTranscode(info)) {
      job.stage = "Convertendo para um formato compatível";
      await transcode(original, path.join(mediaDir, file), info.duration, (p) => {
        job.progress = p;
      });
    } else {
      file = path.basename(original).replace(/\.mov$/i, ".mp4");
      fs.copyFileSync(original, path.join(mediaDir, file));
    }
    const final = await probe(path.join(mediaDir, file));
    Object.assign(job, {
      status: "done",
      progress: 1,
      stage: "Pronto",
      result: {
        file,
        name: req.file.originalname,
        duration: final.duration,
        width: final.width,
        height: final.height,
        hasAudio: final.hasAudio,
      },
    });
  } catch (e) {
    fail(job, e);
  }
});

// ---------- Silêncios ----------

app.post("/api/silences", async (req, res) => {
  try {
    const { file, threshold, minSilence, padding } = req.body ?? {};
    const result = await detectSilences(mediaPath(file), {
      threshold: Number(threshold ?? -35),
      minSilence: Number(minSilence ?? 0.6),
      padding: Number(padding ?? 0.15),
    });
    res.json(result);
  } catch (e) {
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

// ---------- Transcrição ----------

app.post("/api/transcribe", (req, res) => {
  let input;
  try {
    input = mediaPath(req.body?.file);
  } catch (e) {
    return res.status(404).json({ error: e.message });
  }
  const [id, job] = newJob("Na fila");
  res.json({ jobId: id });
  const cfg = config.get();
  queue = queue.then(async () => {
    try {
      const words = await transcribeFile({
        root,
        input,
        model: req.body?.model || cfg.whisperModel,
        language: req.body?.language || cfg.language,
        onStage: (stage, p) => {
          job.stage = stage;
          job.progress = p;
        },
      });
      Object.assign(job, { status: "done", progress: 1, stage: "Pronto", result: { words } });
    } catch (e) {
      fail(job, e);
    }
  });
});

// ---------- Correção da transcrição por IA ----------

app.post("/api/transcript/fix", (req, res) => {
  const words = Array.isArray(req.body?.words) ? req.body.words : [];
  if (!words.length) return res.status(400).json({ error: "Não há transcrição para corrigir." });
  const clean = words.map((w) => ({ text: String(w?.text ?? ""), start: Number(w?.start) || 0, end: Number(w?.end) || 0 }));
  const [id, job] = newJob("Enviando para o Claude");
  res.json({ jobId: id });
  fixTranscript({
    config: config.get(),
    words: clean,
    glossary: String(req.body?.glossary ?? "").slice(0, 4000),
    language: config.get().language,
    onProgress: (p, stage) => Object.assign(job, { progress: p, stage }),
  })
    .then((chunks) => Object.assign(job, { status: "done", progress: 1, stage: "Pronto", result: { chunks } }))
    .catch((e) => fail(job, e));
});

// ---------- Remoção de Fundo com IA & Canal Alfa ----------

app.post("/api/remove-bg", (req, res) => {
  let input;
  try {
    input = mediaPath(req.body?.file);
  } catch (e) {
    return res.status(404).json({ error: e.message });
  }

  const base = path.basename(input).replace(/\.[^.]+$/, "");
  const maskFile = `${base}-mask.mp4`;
  const webmFile = `${base}-alpha.webm`;
  const maskPath = path.join(mediaDir, maskFile);
  const webmPath = path.join(mediaDir, webmFile);

  const [id, job] = newJob("Iniciando IA de remoção de fundo");
  res.json({ jobId: id });

  const py = spawn("python", [
    path.join(root, "server", "remove_bg.py"),
    "--input", input,
    "--output-mask", maskPath,
    "--output-webm", webmPath,
    "--model", path.join(root, "server", "models", "rvm_mobilenetv3_fp32.onnx"),
  ]);

  let resultPayload = null;

  py.stdout.on("data", (data) => {
    const lines = String(data).split("\n");
    for (const line of lines) {
      const clean = line.trim();
      if (clean.startsWith("PROGRESS:")) {
        try {
          const info = JSON.parse(clean.slice(9));
          job.progress = info.progress;
          job.stage = info.stage;
        } catch {}
      } else if (clean.startsWith("DONE:")) {
        try {
          const resObj = JSON.parse(clean.slice(5));
          resultPayload = {
            maskFile: resObj.mask,
            transparentFile: resObj.webm,
          };
        } catch {}
      }
    }
  });

  py.stderr.on("data", (data) => {
    console.error("[remove_bg py]", String(data));
  });

  py.on("error", (err) => {
    if (err.code === "ENOENT") {
      fail(
        job,
        new Error(
          "Python não foi encontrado no sistema. Para usar o Recorte de Fundo com IA, instale o Python em https://python.org e marque a opção 'Add python.exe to PATH'."
        )
      );
    } else {
      fail(job, err);
    }
  });

  py.on("close", (code) => {
    if (code !== 0 && !resultPayload) {
      fail(job, new Error(`O processo de IA falhou com código ${code}`));
    } else {
      Object.assign(job, {
        status: "done",
        progress: 1,
        stage: "Recorte concluído com sucesso!",
        result: resultPayload || {
          maskFile,
          transparentFile: webmFile,
        },
      });
    }
  });
});

// ---------- Edição por prompt ----------

app.post("/api/prompt", async (req, res) => {
  try {
    const { project, message, history, playhead, selection } = req.body ?? {};
    if (!project?.scenes || !message) return res.status(400).json({ error: "Pedido incompleto" });
    const out = await runPrompt({ config: config.get(), project, message, history, playhead, selection });
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(e.status && e.status < 600 ? e.status : 500).json({ error: e.message });
  }
});

// ---------- Geração de imagem ----------

app.post("/api/image", async (req, res) => {
  try {
    const { prompt, aspect, transparent, provider } = req.body ?? {};
    if (!prompt) return res.status(400).json({ error: "Descreva a imagem" });
    const img = await generateImage({ config: config.get(), prompt, aspect, transparent, provider });
    const file = `${Date.now().toString(36)}-ia-${safeName(prompt).slice(0, 30)}.${img.ext}`;
    fs.writeFileSync(path.join(mediaDir, file), img.buffer);
    res.json({ file, width: img.width, height: img.height, provider: img.provider });
  } catch (e) {
    console.error(e);
    res.status(e.status && e.status < 600 ? e.status : 500).json({ error: e.message });
  }
});

// ---------- Pexels API (Auto B-Roll) ----------

const CURATED_PEXELS_DEMO = [
  {
    id: 853889,
    width: 1080,
    height: 1920,
    duration: 12,
    image: "https://images.pexels.com/videos/853889/free-video-853889.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    user: { name: "Pexels Creator", url: "https://www.pexels.com" },
    videoUrl: "https://videos.pexels.com/video-files/853889/853889-hd_1080_1920_25fps.mp4",
  },
  {
    id: 3129671,
    width: 1080,
    height: 1920,
    duration: 15,
    image: "https://images.pexels.com/videos/3129671/free-video-3129671.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    user: { name: "Pexels Creator", url: "https://www.pexels.com" },
    videoUrl: "https://videos.pexels.com/video-files/3129671/3129671-hd_1080_1920_30fps.mp4",
  },
  {
    id: 3129957,
    width: 1080,
    height: 1920,
    duration: 10,
    image: "https://images.pexels.com/videos/3129957/free-video-3129957.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500",
    user: { name: "Pexels Creator", url: "https://www.pexels.com" },
    videoUrl: "https://videos.pexels.com/video-files/3129957/3129957-hd_1080_1920_25fps.mp4",
  },
];

app.get("/api/pexels/search", async (req, res) => {
  try {
    const q = String(req.query.query || "").trim();
    const orientation = String(req.query.orientation || "portrait");
    const page = Number(req.query.page || 1);
    const perPage = Number(req.query.perPage || 15);
    const key = config.get().pexelsKey || process.env.PEXELS_API_KEY;

    if (!key) {
      return res.json({
        needsKey: true,
        videos: CURATED_PEXELS_DEMO,
        message: "Configure sua chave gratuita do Pexels em Configurações para pesquisar no catálogo completo com milhões de vídeos.",
      });
    }

    const url = new URL("https://api.pexels.com/videos/search");
    url.searchParams.set("query", q || "nature");
    if (orientation !== "all") url.searchParams.set("orientation", orientation);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));

    const pexelsRes = await fetch(url.toString(), {
      headers: { Authorization: key },
    });
    const data = await pexelsRes.json().catch(() => ({}));
    if (!pexelsRes.ok) {
      throw new Error(data?.error || `Erro ${pexelsRes.status} na API do Pexels`);
    }

    const videos = (data.videos || []).map((v) => {
      const bestFile =
        v.video_files?.find((f) => f.quality === "hd" && (orientation === "portrait" ? f.height > f.width : f.width > f.height)) ||
        v.video_files?.find((f) => f.quality === "hd") ||
        v.video_files?.[0];
      return {
        id: v.id,
        width: v.width,
        height: v.height,
        duration: v.duration,
        image: v.image,
        user: v.user,
        url: v.url,
        videoUrl: bestFile?.link,
      };
    });

    res.json({ needsKey: false, videos, total_results: data.total_results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const isPexelsTrustedUrl = (urlStr) => {
  try {
    const u = new URL(String(urlStr));
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return (
      h === "pexels.com" ||
      h.endsWith(".pexels.com") ||
      h === "vimeo.com" ||
      h.endsWith(".vimeo.com") ||
      h === "vimeocdn.com" ||
      h.endsWith(".vimeocdn.com")
    );
  } catch {
    return false;
  }
};

app.post("/api/pexels/download", async (req, res) => {
  try {
    const { videoUrl, id, name } = req.body ?? {};
    if (!videoUrl || !isPexelsTrustedUrl(videoUrl)) {
      return res.status(400).json({ error: "URL inválida ou não autorizada. O download é restrito a servidores do Pexels." });
    }

    const safe = safeName(name || `pexels-${id || Date.now()}`).slice(0, 30);
    const originalFile = `${Date.now().toString(36)}-pexels-${safe}.mp4`;
    const targetOriginal = path.join(originalsDir, originalFile);
    const targetMedia = path.join(mediaDir, originalFile);

    const streamRes = await fetch(videoUrl);
    if (!streamRes.ok) throw new Error(`Falha ao transferir vídeo do Pexels (${streamRes.status})`);
    const arrayBuffer = await streamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(targetOriginal, buffer);
    fs.copyFileSync(targetOriginal, targetMedia);

    let info = { duration: 10, width: 1080, height: 1920 };
    try {
      info = await probe(targetMedia);
    } catch {
      /* fallback */
    }

    res.json({
      file: originalFile,
      name: `Pexels - ${name || id}`,
      duration: info.duration || 10,
      width: info.width || 1080,
      height: info.height || 1920,
      kind: "video",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- Sugestões de B-Roll por IA ----------

app.post("/api/broll/suggest", async (req, res) => {
  try {
    const { words, title } = req.body ?? {};
    const suggestions = await suggestBrolls({ config: config.get(), words, title });
    res.json({ suggestions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Extrator de Melhores Momentos (Opus Clip Local) ----------

app.post("/api/ai/highlights", async (req, res) => {
  try {
    const { words, title } = req.body ?? {};
    const highlights = await extractHighlights({ config: config.get(), words, title });
    res.json({ highlights });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Gerador de Copy & SEO para Redes Sociais ----------

app.post("/api/ai/copy", async (req, res) => {
  try {
    const { words, title, tone } = req.body ?? {};
    const copy = await generateSocialCopy({ config: config.get(), words, title, tone });
    res.json(copy);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Exportação ----------

let bundlePromise = null;
let queue = Promise.resolve();

const getBundle = () => {
  if (!bundlePromise) {
    bundlePromise = bundle({ entryPoint: entry, onProgress: () => undefined }).catch((e) => {
      bundlePromise = null;
      throw e;
    });
  }
  return bundlePromise;
};
fs.watch(path.join(root, "src", "remotion"), () => {
  bundlePromise = null;
});

const slug = (s) =>
  String(s || "video")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "video";

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const runRender = async (job, project, options = {}) => {
  try {
    job.stage = "Preparando navegador";
    if (!browserExecutable) await ensureBrowser();
    job.stage = "Empacotando";
    const serveUrl = await getBundle();
    // O renderizador acessa os vídeos e imagens pelo servidor local
    const inputProps = { ...project, mediaBase: MEDIA_BASE };
    const composition = await selectComposition({ serveUrl, id: "Editor", inputProps, browserExecutable });
    const fileBase = options.customName ? slug(options.customName) : slug(project.name);
    const file = `${fileBase}-${stamp()}.mp4`;
    const outputLocation = path.join(outDir, file);
    const crf = typeof options.crf === "number" ? options.crf : options.quality === "high" ? 18 : 22;
    job.stage = "Renderizando";
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      crf,
      audioBitrate: "192k",
      inputProps,
      outputLocation,
      browserExecutable,
      imageFormat: "jpeg",
      jpegQuality: options.quality === "high" ? 95 : 90,
      offthreadVideoCacheSizeInBytes: 1024 * 1024 * 1024,
      onProgress: ({ progress }) => {
        job.progress = progress;
      },
    });
    Object.assign(job, { status: "done", progress: 1, stage: "Pronto", file, path: outputLocation });
    console.log(`✓ Exportado: exportados/${file}`);
  } catch (e) {
    fail(job, e);
  }
};

app.post("/api/render", (req, res) => {
  const project = req.body?.project;
  const options = req.body?.options || {};
  if (!project || !Array.isArray(project.scenes) || !project.scenes.length) {
    return res.status(400).json({ error: "Projeto inválido" });
  }
  const [id, job] = newJob("Na fila");
  // Uma tarefa pesada por vez para não sobrecarregar o PC
  queue = queue.then(() => runRender(job, project, options));
  res.json({ id });
});

// Compatibilidade com a versão anterior do editor
app.get("/api/render/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ status: "error", error: "Exportação não encontrada" });
  const { path: _p, ...pub } = job;
  res.json(pub);
});

app.get("/api/download/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job?.path) return res.status(404).send("Arquivo não encontrado");
  res.download(job.path, job.file);
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Servidor do editor em http://localhost:${PORT}`);
  console.log(`  exportados: ${outDir}`);
  console.log(`  mídia:      ${mediaDir}`);
  getBundle().catch((e) => console.error("Falha ao empacotar:", e.message));
});
