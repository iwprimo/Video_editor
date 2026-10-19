// Gerador de efeitos sonoros (SFX) e trilhas ambientes em WAV sintetizado
// Funciona 100% offline, em qualquer navegador e no renderizador Remotion sem dependências externas.

export type SfxType = "pop" | "whoosh" | "ding" | "click" | "shutter" | "swish" | "riser" | "none";
export type BackgroundAudioPreset = "lofi-chill" | "corporate-upbeat" | "cinematic-pulse" | "custom";

const sfxCache = new Map<string, string>();

const createWavDataUri = (samples: Float32Array, sampleRate = 22050): string => {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // Cabeçalho RIFF / WAVE
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // tamanho do bloco fmt
  view.setUint16(20, 1, true); // formato PCM
  view.setUint16(22, 1, true); // 1 canal (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * 1 canal * 2 bytes)
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // 16 bits por amostra
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  // Amostras PCM 16-bit com clamp de segurança
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  // Conversão para Base64 segura para browser e node
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === "function" ? btoa(binary) : (globalThis as any).btoa(binary);
  return `data:audio/wav;base64,${base64}`;
};

// 1. Pop (bolha/destaque elástico)
const synthPop = (): string => {
  const sampleRate = 22050;
  const duration = 0.085;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const p = t / duration;
    const freq = 850 * Math.exp(-p * 3.2);
    const env = Math.exp(-p * 6);
    out[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.9;
  }
  return createWavDataUri(out, sampleRate);
};

// 2. Whoosh (transição de ar suave e dinâmica)
const synthWhoosh = (): string => {
  const sampleRate = 22050;
  const duration = 0.38;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    // Curva suave de sino para volume
    const env = Math.sin(p * Math.PI) ** 1.8;
    // Ruído branco
    const white = Math.random() * 2 - 1;
    // Filtro passa-faixa simulado com frequência central varrendo de 200 a 1400 Hz e descendo
    const fCenter = 250 + Math.sin(p * Math.PI) * 1200;
    const q = 0.04 + fCenter / sampleRate;
    b0 = b0 + q * (white - b0);
    b1 = b1 + q * (b0 - b1);
    b2 = b2 + q * (b1 - b2);
    out[i] = b2 * env * 1.4;
  }
  return createWavDataUri(out, sampleRate);
};

// 3. Swish (transição rápida e arejada)
const synthSwish = (): string => {
  const sampleRate = 22050;
  const duration = 0.22;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const env = Math.sin(p * Math.PI) ** 2.2;
    const white = Math.random() * 2 - 1;
    const q = 0.08 + Math.sin(p * Math.PI) * 0.12;
    b0 += q * (white - b0);
    b1 += q * (b0 - b1);
    out[i] = b1 * env * 1.5;
  }
  return createWavDataUri(out, sampleRate);
};

// 4. Ding (sino cristalino de conquista/sucesso)
const synthDing = (): string => {
  const sampleRate = 22050;
  const duration = 0.75;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 4.2);
    const fundamental = Math.sin(2 * Math.PI * 1760 * t); // A6
    const overtone = Math.sin(2 * Math.PI * 3520 * t) * 0.45;
    const shimmer = Math.sin(2 * Math.PI * 5280 * t) * 0.15;
    out[i] = (fundamental + overtone + shimmer) * env * 0.75;
  }
  return createWavDataUri(out, sampleRate);
};

// 5. Click (clique seco de precisão)
const synthClick = (): string => {
  const sampleRate = 22050;
  const duration = 0.02;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 180);
    const noise = Math.random() * 2 - 1;
    const chirp = Math.sin(2 * Math.PI * 2400 * t);
    out[i] = (chirp * 0.7 + noise * 0.3) * env * 0.95;
  }
  return createWavDataUri(out, sampleRate);
};

// 6. Camera Shutter (obturador duplo de foto)
const synthShutter = (): string => {
  const sampleRate = 22050;
  const duration = 0.28;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  const click1 = 0;
  const click2 = Math.floor(sampleRate * 0.08);
  for (let i = 0; i < n; i++) {
    let s = 0;
    if (i >= click1) {
      const t = (i - click1) / sampleRate;
      s += Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 120);
    }
    if (i >= click2) {
      const t = (i - click2) / sampleRate;
      s += (Math.sin(2 * Math.PI * 2200 * t) * 0.7 + (Math.random() * 2 - 1) * 0.3) * Math.exp(-t * 90);
    }
    out[i] = s * 0.8;
  }
  return createWavDataUri(out, sampleRate);
};

// 7. Riser (efeito de subida que gera expectativa)
const synthRiser = (): string => {
  const sampleRate = 22050;
  const duration = 1.2;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const freq = 180 + (p ** 2.2) * 720;
    phase += (2 * Math.PI * freq) / sampleRate;
    const env = p ** 1.6;
    out[i] = Math.sin(phase) * env * 0.75;
  }
  return createWavDataUri(out, sampleRate);
};

export const getSfxUri = (type: SfxType): string => {
  if (!type || type === "none") return "";
  const cached = sfxCache.get(type);
  if (cached) return cached;

  let uri = "";
  switch (type) {
    case "pop":
      uri = synthPop();
      break;
    case "whoosh":
      uri = synthWhoosh();
      break;
    case "swish":
      uri = synthSwish();
      break;
    case "ding":
      uri = synthDing();
      break;
    case "click":
      uri = synthClick();
      break;
    case "shutter":
      uri = synthShutter();
      break;
    case "riser":
      uri = synthRiser();
      break;
  }

  sfxCache.set(type, uri);
  return uri;
};

// ----------------------------------------------------
// Presets de Trilha de Fundo Ambiente Sintetizadas
// ----------------------------------------------------

// Lo-Fi Chill: progressão suave com acordes quentes e ritmo sutil
const synthLofiChill = (): string => {
  const sampleRate = 22050;
  const duration = 4.0; // loop de 4 segundos
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);

  // Acordes: Cmaj7 (C E G B), Am7 (A C E G), Dm7 (D F A C), G7 (G B D F)
  const chords = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0],  // Am7
    [146.83, 174.61, 220.0, 261.63], // Dm7
    [196.0, 246.94, 293.66, 349.23], // G7
  ];

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const bar = Math.floor((t / duration) * 4);
    const chord = chords[Math.min(3, bar)];
    const localT = t % 1.0;
    const env = Math.exp(-localT * 1.8) * (1 - Math.exp(-localT * 40));

    let sum = 0;
    for (const freq of chord) {
      // Tom suave tipo piano elétrico com leve vibrato analógico
      const vibrato = Math.sin(2 * Math.PI * 4.5 * t) * 1.2;
      sum += Math.sin(2 * Math.PI * (freq + vibrato) * t) * 0.22;
      sum += Math.sin(2 * Math.PI * (freq * 2) * t) * 0.05;
    }

    // Toque suave de kick a cada tempo
    const kickP = localT % 0.5;
    if (kickP < 0.12) {
      const kf = 120 * Math.exp(-kickP * 35);
      sum += Math.sin(2 * Math.PI * kf * kickP) * Math.exp(-kickP * 25) * 0.35;
    }

    // Leve textura analógica / tape hiss
    const hiss = (Math.random() * 2 - 1) * 0.015;
    out[i] = (sum * env + hiss) * 0.65;
  }

  return createWavDataUri(out, sampleRate);
};

// Corporate Upbeat: plucks rítmicos brilhantes e agradáveis
const synthCorporateUpbeat = (): string => {
  const sampleRate = 22050;
  const duration = 3.6;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);
  const notes = [523.25, 659.25, 783.99, 987.77, 783.99, 659.25, 523.25, 392.0];

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const step = Math.floor((t / duration) * 16) % notes.length;
    const note = notes[step];
    const localT = (t * (16 / duration)) % 1.0;
    const env = Math.exp(-localT * 6.5);
    const pluck = Math.sin(2 * Math.PI * note * t) * env * 0.35;
    out[i] = pluck;
  }

  return createWavDataUri(out, sampleRate);
};

// Cinematic Pulse: pad etéreo com sub-bass pulsante
const synthCinematicPulse = (): string => {
  const sampleRate = 22050;
  const duration = 4.2;
  const n = Math.floor(sampleRate * duration);
  const out = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 2.0 * t);
    const sub = Math.sin(2 * Math.PI * 65.41 * t) * pulse * 0.45; // C2
    const pad1 = Math.sin(2 * Math.PI * 130.81 * t) * 0.2;        // C3
    const pad2 = Math.sin(2 * Math.PI * 196.0 * t) * 0.15;        // G3
    out[i] = (sub + pad1 + pad2) * 0.7;
  }

  return createWavDataUri(out, sampleRate);
};

export const getAmbientPresetUri = (preset: BackgroundAudioPreset): string => {
  const key = `ambient_${preset}`;
  const cached = sfxCache.get(key);
  if (cached) return cached;

  let uri = "";
  switch (preset) {
    case "corporate-upbeat":
      uri = synthCorporateUpbeat();
      break;
    case "cinematic-pulse":
      uri = synthCinematicPulse();
      break;
    case "lofi-chill":
    default:
      uri = synthLofiChill();
      break;
  }

  sfxCache.set(key, uri);
  return uri;
};

// Toca o efeito no navegador para pré-escuta imediata pelo usuário no editor
export const playSfxPreview = (type: SfxType, volume = 0.7) => {
  if (typeof window === "undefined" || !type || type === "none") return;
  try {
    const uri = getSfxUri(type);
    if (!uri) return;
    const audio = new Audio(uri);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => undefined);
  } catch {
    /* browser policy or unsupported */
  }
};
