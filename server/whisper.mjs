// Transcrição local com whisper.cpp (via @remotion/install-whisper-cpp).
// Na primeira vez baixa o programa e o modelo; depois funciona offline.
import fs from "node:fs";
import path from "node:path";
import { installWhisperCpp, downloadWhisperModel, transcribe, toCaptions } from "@remotion/install-whisper-cpp";
import { extractWav } from "./media.mjs";

// 1.5.5 tem binário pronto para Windows; em Linux/macOS é compilado (precisa de git e make)
const WHISPER_VERSION = "1.5.5";

export const MODELS = ["tiny", "base", "small", "medium", "large-v3-turbo"];

export const transcribeFile = async ({ root, input, model = "small", language = "pt", onStage }) => {
  const whisperPath = path.join(root, "whisper", "whisper.cpp");
  const modelFolder = path.join(root, "whisper", "modelos");
  fs.mkdirSync(modelFolder, { recursive: true });
  const m = MODELS.includes(model) ? model : "small";

  onStage?.("Preparando o Whisper (só na primeira vez)", 0);
  try {
    await installWhisperCpp({ version: WHISPER_VERSION, to: whisperPath, printOutput: false });
  } catch (e) {
    fs.rmSync(whisperPath, { recursive: true, force: true });
    throw new Error(
      `Não foi possível instalar o Whisper (${e.message}). Verifique a internet` +
        (process.platform === "win32" ? "." : " e se git e make estão instalados."),
    );
  }

  // Download interrompido antes pode ter deixado um arquivo vazio
  const modelFile = path.join(modelFolder, `ggml-${m}.bin`);
  if (fs.existsSync(modelFile) && fs.statSync(modelFile).size < 1024 * 1024) fs.rmSync(modelFile);

  onStage?.(`Baixando o modelo "${m}" (só na primeira vez)`, 0);
  try {
    await downloadWhisperModel({
      model: m,
      folder: modelFolder,
      printOutput: false,
      onProgress: (done, total) => total && onStage?.(`Baixando o modelo "${m}" (só na primeira vez)`, done / total),
    });
  } catch (e) {
    const target = path.join(modelFolder, `ggml-${m}.bin`);
    fs.rmSync(target, { force: true });
    throw new Error(
      `Não foi possível baixar o modelo do Whisper (${e.message}). Se a rede bloqueia huggingface.co, ` +
        `baixe ggml-${m}.bin de https://huggingface.co/ggerganov/whisper.cpp em outra rede e coloque em ${modelFolder}.`,
    );
  }

  onStage?.("Extraindo o áudio", 0);
  const wav = path.join(root, "midia", `.tmp-${Date.now()}.wav`);
  await extractWav(input, wav);

  try {
    onStage?.("Transcrevendo", 0);
    const out = await transcribe({
      inputPath: wav,
      whisperPath,
      whisperCppVersion: WHISPER_VERSION,
      model: m,
      modelFolder,
      tokenLevelTimestamps: true,
      splitOnWord: true,
      language: language || null,
      printOutput: false,
      onProgress: (p) => onStage?.("Transcrevendo", p),
    });
    const { captions } = toCaptions({ whisperCppOutput: out });
    return captions
      .map((c) => ({ text: c.text.trim(), start: c.startMs / 1000, end: c.endMs / 1000 }))
      .filter((w) => w.text && !/^\[.*\]$/.test(w.text));
  } finally {
    fs.rmSync(wav, { force: true });
  }
};
