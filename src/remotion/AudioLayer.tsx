import React, { useMemo } from "react";
import { Audio, Sequence, useVideoConfig } from "remotion";
import {
  FPS,
  Project,
  outputWords,
  overlayWindow,
  sceneStarts,
  totalFrames,
  transitionFrames,
} from "./types";
import { getAmbientPresetUri, getSfxUri } from "./sfx";

export type DuckingWindow = { startMs: number; endMs: number };

// Consolida os trechos falados em janelas de auto-ducking com margens suaves
export const getSpeechIntervals = (project: Project, leadInMs = 150, leadOutMs = 350): DuckingWindow[] => {
  const words = outputWords(project);
  if (!words.length) return [];

  const raw: DuckingWindow[] = words.map((w) => ({
    startMs: Math.max(0, w.startMs - leadInMs),
    endMs: w.endMs + leadOutMs,
  }));

  const merged: DuckingWindow[] = [];
  for (const interval of raw) {
    const last = merged[merged.length - 1];
    if (last && interval.startMs <= last.endMs + 380) {
      last.endMs = Math.max(last.endMs, interval.endMs);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
};

// Calcula a curva suave de volume frame a frame para o auto-ducking
export const calculateDuckedVolume = (
  frame: number,
  speechIntervals: DuckingWindow[],
  baseVolume: number,
  duckedVolume: number,
  rampMs = 250,
): number => {
  if (!speechIntervals.length) return baseVolume;

  const currentMs = (frame / FPS) * 1000;

  for (const interval of speechIntervals) {
    // 1. Durante a fala: volume abaixado (ducked)
    if (currentMs >= interval.startMs && currentMs <= interval.endMs) {
      return duckedVolume;
    }

    // 2. Transição de descida (ramp down) antes da fala começar
    if (currentMs >= interval.startMs - rampMs && currentMs < interval.startMs) {
      const progress = (currentMs - (interval.startMs - rampMs)) / rampMs;
      return baseVolume - progress * (baseVolume - duckedVolume);
    }

    // 3. Transição de subida (ramp up) após o término da fala
    if (currentMs > interval.endMs && currentMs <= interval.endMs + rampMs) {
      const progress = (currentMs - interval.endMs) / rampMs;
      return duckedVolume + progress * (baseVolume - duckedVolume);
    }
  }

  return baseVolume;
};

export const AudioLayer: React.FC<{ project: Project; mediaBase: string }> = ({ project, mediaBase }) => {
  const { fps } = useVideoConfig();
  const audioCfg = project.audio;
  const isAudioEnabled = !!audioCfg?.enabled;

  const speechIntervals = useMemo(() => {
    if (!isAudioEnabled || !audioCfg?.ducking) return [];
    return getSpeechIntervals(project);
  }, [project, isAudioEnabled, audioCfg?.ducking]);

  const bgAudioSrc = useMemo(() => {
    if (!isAudioEnabled) return "";
    if (audioCfg?.file) {
      if (audioCfg.file.startsWith("http") || audioCfg.file.startsWith("data:") || audioCfg.file.startsWith("/")) {
        return audioCfg.file;
      }
      return `${mediaBase}/media/${audioCfg.file}`;
    }
    return getAmbientPresetUri(audioCfg?.preset ?? "lofi-chill");
  }, [isAudioEnabled, audioCfg?.file, audioCfg?.preset, mediaBase]);

  const baseVol = audioCfg?.volume ?? 0.3;
  const duckVol = audioCfg?.duckingVolume ?? 0.08;
  const rampMs = audioCfg?.duckingRampMs ?? 250;
  const totalDuration = totalFrames(project);

  // Efeitos sonoros de transições entre cenas
  const transitionSfx = useMemo(() => {
    const starts = sceneStarts(project.scenes);
    const items: { frame: number; sfx: string; key: string }[] = [];

    project.scenes.forEach((scene, i) => {
      const tFrames = transitionFrames(project.scenes, i);
      if (tFrames > 0 && scene.transition?.sfx && scene.transition.sfx !== "none") {
        const transStartFrame = starts[i] + scene.duration - tFrames;
        items.push({
          frame: transStartFrame,
          sfx: scene.transition.sfx,
          key: `t-sfx-${scene.id}-${i}`,
        });
      }
    });

    return items;
  }, [project.scenes]);

  // Efeitos sonoros de ilustrações / overlays
  const overlaySfx = useMemo(() => {
    const items: { frame: number; sfx: string; key: string }[] = [];

    (project.overlays ?? []).forEach((ov) => {
      if (ov.sfx && ov.sfx !== "none") {
        const win = overlayWindow(project, ov);
        if (win) {
          items.push({
            frame: win.from,
            sfx: ov.sfx,
            key: `ov-sfx-${ov.id}`,
          });
        }
      }
    });

    return items;
  }, [project]);

  return (
    <>
      {/* 1. Trilha de Áudio de Fundo com Auto-Ducking */}
      {isAudioEnabled && bgAudioSrc ? (
        <Sequence from={0} durationInFrames={totalDuration} name="Trilha Sonora">
          <Audio
            src={bgAudioSrc}
            loop={audioCfg?.loop ?? true}
            volume={(f) => {
              if (!audioCfg?.ducking || !speechIntervals.length) {
                return baseVol;
              }
              return calculateDuckedVolume(f, speechIntervals, baseVol, duckVol, rampMs);
            }}
          />
        </Sequence>
      ) : null}

      {/* 2. SFX de Transições */}
      {transitionSfx.map((item) => {
        const uri = getSfxUri(item.sfx as any);
        if (!uri) return null;
        return (
          <Sequence key={item.key} from={item.frame} durationInFrames={Math.round(fps * 0.6)} name={`SFX: ${item.sfx}`}>
            <Audio src={uri} volume={0.65} />
          </Sequence>
        );
      })}

      {/* 3. SFX de Ilustrações / Overlays */}
      {overlaySfx.map((item) => {
        const uri = getSfxUri(item.sfx as any);
        if (!uri) return null;
        return (
          <Sequence key={item.key} from={item.frame} durationInFrames={Math.round(fps * 0.75)} name={`SFX: ${item.sfx}`}>
            <Audio src={uri} volume={0.7} />
          </Sequence>
        );
      })}
    </>
  );
};
