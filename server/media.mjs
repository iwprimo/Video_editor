// Operações de mídia com o ffmpeg que já vem junto com o Remotion (nada extra para instalar).
import fs from "node:fs";
import path from "node:path";
import { RenderInternals } from "@remotion/renderer";

const run = (bin, args, onStderr) => {
  const task = RenderInternals.callFf({
    bin,
    args,
    indent: false,
    logLevel: "error",
    binariesDirectory: null,
    cancelSignal: undefined,
  });
  if (onStderr) task.stderr?.on("data", (d) => onStderr(String(d)));
  return task;
};

export const probe = async (file) => {
  const { stdout } = await run("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]);
  const info = JSON.parse(stdout);
  const v = info.streams?.find((s) => s.codec_type === "video");
  const a = info.streams?.find((s) => s.codec_type === "audio");
  const rotationTag = Number(v?.tags?.rotate ?? 0);
  const sideRot = Number(v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0);
  const rotation = Math.abs(rotationTag || sideRot) % 180 === 90;
  return {
    duration: Number(info.format?.duration ?? v?.duration ?? 0),
    width: rotation ? v?.height : v?.width,
    height: rotation ? v?.width : v?.height,
    videoCodec: v?.codec_name ?? null,
    pixFmt: v?.pix_fmt ?? null,
    audioCodec: a?.codec_name ?? null,
    hasAudio: !!a,
    rotated: rotation,
    container: info.format?.format_name ?? "",
  };
};

// Navegadores tocam H.264 + AAC em MP4 sem problemas; o resto é convertido
export const needsTranscode = (p) =>
  !(
    p.videoCodec === "h264" &&
    (p.pixFmt === "yuv420p" || p.pixFmt === "yuvj420p") &&
    (!p.hasAudio || p.audioCodec === "aac") &&
    /mp4|mov/.test(p.container) &&
    !p.rotated
  );

const parseTime = (line) => {
  const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
};

export const transcode = async (input, output, duration, onProgress) => {
  const base = [
    "-y",
    "-i",
    input,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-vf",
    "scale='min(1920,iw)':-2",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    output,
  ];
  const progress = (chunk) => {
    const t = parseTime(chunk);
    if (t !== null && duration > 0) onProgress?.(Math.min(0.99, t / duration));
  };
  try {
    await run("ffmpeg", base, progress);
  } catch (e) {
    // Alguns celulares gravam com metadado de rotação que este ffmpeg não gira; tenta preservar o metadado
    if (fs.existsSync(output)) fs.rmSync(output);
    await run("ffmpeg", ["-noautorotate", ...base], progress);
  }
};

// Áudio mono 16 kHz, formato que o Whisper espera
export const extractWav = async (input, output) => {
  await run("ffmpeg", ["-y", "-i", input, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", output]);
};

// Picos de áudio para desenhar a forma de onda na linha do tempo.
// Lê só o áudio, em mono e 4 kHz, então mesmo um vídeo de vários GB vira poucos MB no processo.
// Devolve 50 valores por segundo, de 0 a 255, e guarda o resultado em cache ao lado da mídia.
export const WAVE_SPS = 50;
const WAVE_RATE = 4000;
export const waveformPeaks = async (input, cacheFile) => {
  try {
    const st = fs.statSync(input);
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    if (cached.size === st.size && cached.mtimeMs === st.mtimeMs && Array.isArray(cached.peaks)) return cached;
  } catch {
    /* sem cache válido */
  }
  const tmp = path.join(path.dirname(cacheFile), `.${path.basename(cacheFile)}.${process.pid}.wav`);
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  try {
    // O ffmpeg do Remotion é enxuto: grava WAV (como na transcrição), e os dados começam no bloco "data"
    await run("ffmpeg", ["-y", "-v", "error", "-i", input, "-vn", "-ac", "1", "-ar", String(WAVE_RATE), "-c:a", "pcm_s16le", tmp]);
    const file = fs.readFileSync(tmp);
    let off = 12;
    while (off + 8 <= file.length && file.toString("ascii", off, off + 4) !== "data") off += 8 + file.readUInt32LE(off + 4);
    const buf = off + 8 <= file.length ? file.subarray(off + 8) : Buffer.alloc(0);
    const samples = Math.floor(buf.length / 2);
    const per = WAVE_RATE / WAVE_SPS;
    const n = Math.ceil(samples / per);
    const peaks = new Array(n);
    for (let i = 0; i < n; i++) {
      let max = 0;
      const end = Math.min(samples, (i + 1) * per);
      for (let j = i * per; j < end; j++) {
        const v = Math.abs(buf.readInt16LE(j * 2));
        if (v > max) max = v;
      }
      peaks[i] = Math.min(255, Math.round((max / 32768) * 255));
    }
    const st = fs.statSync(input);
    const out = { sps: WAVE_SPS, size: st.size, mtimeMs: st.mtimeMs, peaks };
    fs.writeFileSync(cacheFile, JSON.stringify(out));
    return out;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
};

// Detecta silêncios e devolve os intervalos a cortar (já com a margem aplicada)
export const detectSilences = async (input, { threshold = -35, minSilence = 0.6, padding = 0.15 } = {}) => {
  let stderr = "";
  await run(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", input, "-vn", "-af", `silencedetect=noise=${threshold}dB:d=${minSilence}`, "-f", "null", "-"],
    (d) => {
      stderr += d;
    },
  );
  const silences = [];
  let start = null;
  for (const line of stderr.split(/\r?\n/)) {
    const s = /silence_start: (-?\d+(?:\.\d+)?)/.exec(line);
    const e = /silence_end: (-?\d+(?:\.\d+)?)/.exec(line);
    if (s) start = Math.max(0, Number(s[1]));
    if (e && start !== null) {
      silences.push({ start, end: Number(e[1]) });
      start = null;
    }
  }
  // Silêncio que vai até o fim do arquivo
  if (start !== null) {
    const p = await probe(input);
    silences.push({ start, end: p.duration });
  }
  const cuts = silences
    .map((s) => ({ start: s.start === 0 ? 0 : s.start + padding, end: s.end - padding }))
    .filter((c) => c.end - c.start > 0.1);
  return { silences, cuts };
};

export const safeName = (name) =>
  path
    .basename(String(name || "arquivo"))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "arquivo";
