// Gerador e cache de forma de onda (waveform) de áudio para a timeline.
// Extrai picos de áudio reais via Web Audio API e sincroniza com a fala/palavras.

import type { Word } from "../remotion/types";

const waveformCache = new Map<string, Float32Array>();
const pendingFetches = new Map<string, Promise<Float32Array>>();

const SAMPLES_PER_SEC = 50;

/**
 * Busca os picos de áudio calculados pelo servidor (ffmpeg lê só o áudio, em baixa resolução).
 * Antes o navegador baixava o vídeo inteiro para decodificar, o que travava com arquivos de vários GB.
 * Devolve um Float32Array com picos normalizados (0..1) a 50 amostras por segundo.
 */
export const fetchAudioWaveform = async (file: string, apiBase = ""): Promise<Float32Array> => {
  const key = `${apiBase}|${file}`;
  if (waveformCache.has(key)) return waveformCache.get(key)!;
  if (pendingFetches.has(key)) return pendingFetches.get(key)!;

  const promise = (async () => {
    try {
      const res = await fetch(`${apiBase}/api/waveform?file=${encodeURIComponent(file)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { sps?: number; peaks?: number[] };
      const src = data.peaks ?? [];
      const ratio = (data.sps || SAMPLES_PER_SEC) / SAMPLES_PER_SEC;
      const n = Math.floor(src.length / ratio);
      const peaks = new Float32Array(n);
      for (let i = 0; i < n; i++) peaks[i] = Math.min(1, (src[Math.floor(i * ratio)] ?? 0) / 255);
      waveformCache.set(key, peaks);
      return peaks;
    } catch (err) {
      console.warn("[Waveform] Forma de onda indisponível, usando o desenho pela fala:", err);
      return new Float32Array(0);
    } finally {
      pendingFetches.delete(key);
    }
  })();

  pendingFetches.set(key, promise);
  return promise;
};

/**
 * Gera um envelope procedural instantâneo a partir dos timestamps das palavras transcritas.
 * Usado imediatamente enquanto o áudio completo decodifica em segundo plano.
 */
export const generateWordWaveform = (words: Word[] = [], duration: number): Float32Array => {
  const totalSamples = Math.ceil(Math.max(1, duration) * SAMPLES_PER_SEC);
  const peaks = new Float32Array(totalSamples);
  if (!words.length) return peaks;

  for (const w of words) {
    const sIdx = Math.max(0, Math.floor(w.start * SAMPLES_PER_SEC));
    const eIdx = Math.min(totalSamples, Math.ceil(w.end * SAMPLES_PER_SEC));
    for (let i = sIdx; i < eIdx; i++) {
      // Modulação senoidal para simular envelope de fala natural
      const mid = (sIdx + eIdx) / 2;
      const dist = Math.abs(i - mid) / Math.max(1, (eIdx - sIdx) / 2);
      const amp = 0.4 + 0.5 * (1 - dist * dist);
      peaks[i] = Math.max(peaks[i], amp);
    }
  }

  return peaks;
};

/**
 * Desenha a forma de onda do trecho em um Canvas 2D.
 */
export const drawWaveformCanvas = ({
  canvas,
  peaks,
  segments,
  color = "#38bdf8",
  height = 26,
}: {
  canvas: HTMLCanvasElement;
  peaks: Float32Array;
  segments: { start: number; end: number }[];
  color?: string;
  height?: number;
}) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  ctx.clearRect(0, 0, width, canvas.height);

  if (!peaks || peaks.length === 0 || !segments || segments.length === 0) {
    // Linha de silêncio central sutil
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(width, canvas.height / 2);
    ctx.stroke();
    return;
  }

  const totalLocalDuration = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  if (totalLocalDuration <= 0) return;

  const centerY = canvas.height / 2;
  const maxAmpH = (canvas.height - 4) / 2;

  ctx.fillStyle = color;

  // Desenhar barras com largura de 2px e espaçamento de 1px
  const barWidth = 2;
  const barGap = 1;
  const step = barWidth + barGap;
  const numBars = Math.floor(width / step);

  for (let b = 0; b < numBars; b++) {
    const x = b * step;
    const progress = b / Math.max(1, numBars);
    const localTime = progress * totalLocalDuration;

    // Converter tempo local para tempo da fonte original
    let accum = 0;
    let sourceTime = segments[0]?.start ?? 0;
    for (const seg of segments) {
      const segLen = seg.end - seg.start;
      if (accum + segLen >= localTime) {
        sourceTime = seg.start + (localTime - accum);
        break;
      }
      accum += segLen;
    }

    const peakIdx = Math.floor(sourceTime * SAMPLES_PER_SEC);
    const rawVal = peakIdx < peaks.length ? peaks[peakIdx] : 0;
    // Curva não linear para visualização nítida de fala
    const val = Math.pow(rawVal, 0.7);
    const h = Math.max(2, val * maxAmpH);

    ctx.fillRect(x, centerY - h, barWidth, h * 2);
  }
};
