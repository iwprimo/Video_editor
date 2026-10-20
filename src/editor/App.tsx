import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { Heart, MessageCircle, Bookmark, Share2, Download, Shield, Sparkles, Flame, Scissors, Image as ImageIcon } from "lucide-react";
import { Video } from "../remotion/Video";
import {
  DEFAULT_CAPTIONS,
  DEFAULT_PROGRESS_BAR,
  DEFAULT_TRANSITION,
  EFFECTS,
  FORMATS,
  FPS,
  FormatId,
  Project,
  Scene,
  SceneType,
  TRANSITIONS,
  OVERLAYS,
  Overlay,
  VideoScene,
  defaultProject,
  locateFrame,
  localToSource,
  makeEffect,
  makeScene,
  sceneStarts,
  sourceToLocal,
  totalFrames,
  transitionFrames,
  uid,
  videoFrames,
  withVideoDuration,
  normalizeProject,
} from "../remotion/types";
import { FxPayload } from "./EffectsLibrary";
import { OverlayPayload } from "./IllustrationsLibrary";
import { Library } from "./Library";
import { useHistory } from "./useHistory";
import { Timeline } from "./Timeline";
import { Inspector } from "./Inspector";
import { VideoPanel } from "./VideoPanel";
import { ResizeHandle, useLayout } from "./Resizers";
import { OverlayInspector } from "./OverlayInspector";
import { PromptBar, PromptEntry } from "./PromptBar";
import { PublicConfig, Settings, loadConfig } from "./Settings";
import { ExportModal } from "./ExportModal";
import { HighlightsModal, Highlight } from "./HighlightsModal";
import { SocialCopyModal } from "./SocialCopyModal";
import { CoverModal } from "./CoverModal";
import { applyOps, AiOp } from "./ops";
import { imageSize, pollJob, postJson, uploadFile } from "./api";

const STORAGE_KEY = "editor-video:projeto";

const loadSaved = (): Project => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Project;
      if (p && Array.isArray(p.scenes) && p.scenes.length) return normalizeProject(p);
    }
  } catch {
    /* sem armazenamento disponível */
  }
  return defaultProject();
};

const SafeZonesOverlay: React.FC = () => (
  <div className="safe-zones-overlay" aria-hidden="true">
    <div className="sz-top">
      <span className="sz-badge">Topo (Abas e Busca)</span>
    </div>
    <div className="sz-right">
      <span className="sz-icon-ghost"><Heart size={18} fill="currentColor" /></span>
      <span className="sz-icon-ghost"><MessageCircle size={18} fill="currentColor" /></span>
      <span className="sz-icon-ghost"><Bookmark size={18} fill="currentColor" /></span>
      <span className="sz-icon-ghost"><Share2 size={18} /></span>
    </div>
    <div className="sz-bottom">
      <div className="sz-bottom-placeholder" />
      <div className="sz-bottom-placeholder short" />
      <span className="sz-badge" style={{ marginTop: 2 }}>Áudio e Legenda do Post</span>
    </div>
    <div className="sz-safe-box">
      <span className="sz-safe-box-label">Área Segura (Reels / TikTok)</span>
    </div>
  </div>
);

type ExportState =
  | { status: "idle" }
  | { status: "running"; id: string; progress: number; stage: string }
  | { status: "done"; id: string; file: string }
  | { status: "error"; message: string };

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

export const App: React.FC = () => {
  const history = useHistory<Project>(loadSaved);
  const project = history.value;
  const playerRef = useRef<PlayerRef>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { layout, setLayout, reset: resetLayout } = useLayout();
  const fileRef = useRef<HTMLInputElement>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(project.scenes[0]?.id ?? null);
  const [stage, setStage] = useState({ w: 800, h: 450 });
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [exp, setExp] = useState<ExportState>({ status: "idle" });
  const [toast, setToast] = useState<string | null>(null);
  const [hoverFx, setHoverFx] = useState<FxPayload | null>(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"scene" | "project">("scene");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [socialCopyOpen, setSocialCopyOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [promptStatus, setPromptStatus] = useState<string | null>(null);
  const [promptHistory, setPromptHistory] = useState<PromptEntry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [importing, setImporting] = useState<{ stage: string; progress: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fmt = FORMATS[project.format] ?? FORMATS.landscape;
  const total = totalFrames(project);
  const scene = project.scenes.find((s) => s.id === selectedId) ?? null;
  const sceneIndex = project.scenes.findIndex((s) => s.id === selectedId);
  const isLastScene = sceneIndex === project.scenes.length - 1;
  const overlay = project.overlays?.find((o) => o.id === selectedOverlayId) ?? null;
  const hasVideo = project.scenes.some((s) => s.type === "video");

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (selectedOverlayId && !overlay) setSelectedOverlayId(null);
  }, [selectedOverlayId, overlay]);

  // Salva automaticamente no navegador
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        /* ignora */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [project]);

  // Mantém uma seleção válida após desfazer/excluir
  useEffect(() => {
    if (!project.scenes.some((s) => s.id === selectedId)) setSelectedId(project.scenes[0]?.id ?? null);
  }, [project.scenes, selectedId]);

  // Ajusta a prévia ao espaço disponível, para qualquer formato
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const pad = 32;
      const scale = Math.min((el.clientWidth - pad) / fmt.width, (el.clientHeight - pad) / fmt.height);
      setStage({ w: Math.max(80, fmt.width * scale), h: Math.max(45, fmt.height * scale) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fmt.width, fmt.height]);

  // Sincroniza o cursor da linha do tempo com o player
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("seeked", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("seeked", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onPause);
    };
  }, []);

  const seek = useCallback(
    (f: number) => {
      const clamped = Math.max(0, Math.min(total - 1, f));
      playerRef.current?.seekTo(clamped);
      setFrame(clamped);
    },
    [total],
  );

  const togglePlay = useCallback(() => playerRef.current?.toggle(), []);

  // Mensagens longas (erros com instruções) ficam mais tempo na tela
  const flash = (msg: string) => {
    setToast(msg);
    const ms = Math.min(14000, Math.max(2600, msg.length * 65));
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), ms);
  };

  const updateScene = useCallback(
    (patch: Partial<Scene>, mergeKey?: string) => {
      if (!selectedId) return;
      history.set(
        (p) => ({ ...p, scenes: p.scenes.map((s) => (s.id === selectedId ? withVideoDuration({ ...s, ...patch } as Scene) : s)) }),
        mergeKey ? `${selectedId}:${mergeKey}` : undefined,
      );
    },
    [history, selectedId],
  );

  const updateProject = useCallback(
    (patch: Partial<Project>, mergeKey?: string) => history.set((p) => ({ ...p, ...patch }), mergeKey ? `project:${mergeKey}` : undefined),
    [history],
  );

  const startOf = (p: Project, id: string) => {
    const i = p.scenes.findIndex((s) => s.id === id);
    return i < 0 ? 0 : sceneStarts(p.scenes)[i];
  };

  // Aplica um efeito ou transição a uma cena (ou ao vídeo inteiro)
  const withFx = (p: Project, fx: FxPayload, target: "scene" | "global", sceneId: string | null): Project => {
    if (fx.kind === "effect") {
      if (target === "global") {
        const list = p.effects ?? [];
        if (list.some((e) => e.type === fx.type)) return p;
        return { ...p, effects: [...list, makeEffect(fx.type)] };
      }
      return {
        ...p,
        scenes: p.scenes.map((s) => {
          if (s.id !== sceneId) return s;
          const list = s.effects ?? [];
          if (list.some((e) => e.type === fx.type)) return s;
          return { ...s, effects: [...list, makeEffect(fx.type)] };
        }),
      };
    }
    return {
      ...p,
      scenes: p.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        const prev = s.transition ?? DEFAULT_TRANSITION;
        return { ...s, transition: { ...prev, type: fx.type, duration: prev.type === "cut" ? 18 : prev.duration } };
      }),
    };
  };

  const applyFx = (fx: FxPayload, target: "scene" | "global", sceneId: string | null = selectedId) => {
    setHoverFx(null);
    const idx = project.scenes.findIndex((s) => s.id === sceneId);
    if (target === "scene" && idx < 0) {
      flash("Selecione uma cena primeiro");
      return;
    }
    if (fx.kind === "transition" && idx === project.scenes.length - 1) {
      flash("A última cena não tem próxima — aplique a transição em outra cena");
      return;
    }
    const next = withFx(project, fx, target, sceneId);
    const name = fx.kind === "effect" ? EFFECTS[fx.type].name : TRANSITIONS[fx.type].name;
    if (next === project) {
      flash(`${name} já está aplicado`);
      return;
    }
    history.set(next);
    if (sceneId && target === "scene") setSelectedId(sceneId);
    flash(target === "global" ? `${name} aplicado no vídeo inteiro` : `${name} aplicado`);
    if (fx.kind === "transition") {
      const st = sceneStarts(next.scenes);
      const t = transitionFrames(next.scenes, idx);
      requestAnimationFrame(() => seek(Math.max(0, st[idx + 1] - 12)));
      if (t > 0) requestAnimationFrame(() => playerRef.current?.play());
    }
  };

  const addScene = (type: SceneType) => {
    const s = makeScene(type);
    const idx = project.scenes.findIndex((x) => x.id === selectedId);
    const scenes = [...project.scenes];
    scenes.splice(idx < 0 ? scenes.length : idx + 1, 0, s);
    const next = { ...project, scenes };
    history.set(next);
    setSelectedId(s.id);
    requestAnimationFrame(() => seek(startOf(next, s.id) + Math.min(60, Math.round(s.duration * 0.6))));
  };

  const duplicateScene = () => {
    const idx = project.scenes.findIndex((x) => x.id === selectedId);
    if (idx < 0) return;
    const copy = { ...structuredClone(project.scenes[idx]), id: uid() };
    const scenes = [...project.scenes];
    scenes.splice(idx + 1, 0, copy);
    history.set({ ...project, scenes });
    setSelectedId(copy.id);
  };

  const deleteScene = () => {
    if (project.scenes.length <= 1) return;
    const idx = project.scenes.findIndex((x) => x.id === selectedId);
    if (idx < 0) return;
    const removed = project.scenes[idx].id;
    const scenes = project.scenes.filter((_, i) => i !== idx);
    history.set({ ...project, scenes, overlays: (project.overlays ?? []).filter((o) => o.sceneId !== removed) });
    setSelectedId(scenes[Math.min(idx, scenes.length - 1)].id);
  };

  const starts = useMemo(() => sceneStarts(project.scenes), [project.scenes]);
  const canSplit = useMemo(() => {
    return project.scenes.some((s, i) => frame > starts[i] + 5 && frame < starts[i] + s.duration - 5);
  }, [project.scenes, starts, frame]);

  const splitSceneAtPlayhead = () => {
    const idx = project.scenes.findIndex((s, i) => frame > starts[i] + 5 && frame < starts[i] + s.duration - 5);
    if (idx < 0) {
      flash("Posicione o cursor dentro de uma cena (com pelo menos 6 quadros de folga) para cortar.");
      return;
    }
    const scene = project.scenes[idx];
    const offsetFrames = frame - starts[idx];
    const splitLocalSeconds = offsetFrames / FPS;

    let scene1: Scene;
    let scene2: Scene;
    const newId2 = uid();

    if (scene.type === "video") {
      let accumulated = 0;
      const segs1: typeof scene.segments = [];
      const segs2: typeof scene.segments = [];
      for (const seg of scene.segments) {
        const len = seg.end - seg.start;
        if (accumulated + len <= splitLocalSeconds) {
          segs1.push({ ...seg });
          accumulated += len;
        } else if (accumulated < splitLocalSeconds) {
          const cutPoint = Math.round((seg.start + (splitLocalSeconds - accumulated)) * FPS) / FPS;
          segs1.push({ ...seg, end: cutPoint });
          segs2.push({ ...seg, start: cutPoint });
          accumulated = splitLocalSeconds;
        } else {
          segs2.push({ ...seg });
        }
      }
      scene1 = withVideoDuration({ ...scene, segments: segs1 });
      scene2 = withVideoDuration({ ...scene, id: newId2, segments: segs2 });
    } else {
      scene1 = { ...scene, duration: offsetFrames };
      scene2 = { ...structuredClone(scene), id: newId2, duration: scene.duration - offsetFrames };
    }

    const nextOverlays = (project.overlays ?? []).map((o) => {
      if (o.sceneId !== scene.id) return o;
      if (o.at >= splitLocalSeconds) {
        return { ...o, sceneId: newId2, at: Math.max(0, o.at - splitLocalSeconds) };
      }
      return o;
    });

    const nextScenes = [...project.scenes];
    nextScenes.splice(idx, 1, scene1, scene2);

    history.set({
      ...project,
      scenes: nextScenes,
      overlays: nextOverlays,
    });
    setSelectedId(newId2);
    flash("Cena cortada no ponto do cursor (Atalho: S ou C)");
  };

  // ---------- Melhores Momentos (Shorts por IA) ----------
  const handleApplyHighlight = (h: Highlight, mode: "isolate" | "newScene") => {
    const vScene = project.scenes.find((s): s is VideoScene => s.type === "video");
    if (!vScene) return;

    if (mode === "isolate") {
      const nextScene: VideoScene = withVideoDuration({
        ...vScene,
        segments: [{ start: h.start, end: h.end }],
      });
      history.set({
        ...project,
        name: h.title,
        captions: { ...(project.captions ?? DEFAULT_CAPTIONS), enabled: true },
        scenes: project.scenes.map((s) => (s.id === vScene.id ? nextScene : s)),
      });
      flash(`Short criado com sucesso: "${h.title}"! Legendas ativadas.`);
      seek(0);
    } else {
      const newId = uid();
      const newScene: VideoScene = withVideoDuration({
        ...structuredClone(vScene),
        id: newId,
        segments: [{ start: h.start, end: h.end }],
      });
      const idx = project.scenes.findIndex((s) => s.id === vScene.id);
      const nextScenes = [...project.scenes];
      nextScenes.splice(idx + 1, 0, newScene);
      history.set({
        ...project,
        scenes: nextScenes,
      });
      setSelectedId(newId);
      flash(`Nova cena de Short criada: "${h.title}"!`);
    }
  };

  const handlePreviewTime = (secs: number) => {
    const vScene = project.scenes.find((s): s is VideoScene => s.type === "video");
    if (!vScene) return;
    const sIdx = project.scenes.findIndex((s) => s.id === vScene.id);
    const startFr = sIdx >= 0 ? sceneStarts(project.scenes)[sIdx] || 0 : 0;
    const localSecs = sourceToLocal(vScene.segments, secs);
    if (localSecs !== null) {
      seek(startFr + Math.round(localSecs * FPS));
      playerRef.current?.play();
    }
  };

  // ---------- Seleção ----------
  const selectScene = (id: string) => {
    setSelectedId(id);
    setSelectedOverlayId(null);
  };
  const selectOverlay = (id: string) => {
    setSelectedOverlayId(id);
    setInspectorTab("scene");
  };

  // ---------- Ilustrações ----------
  const updateOverlay = (patch: Partial<Overlay>, mergeKey?: string) => {
    if (!selectedOverlayId) return;
    history.set(
      (p) => ({ ...p, overlays: (p.overlays ?? []).map((o) => (o.id === selectedOverlayId ? { ...o, ...patch } : o)) }),
      mergeKey ? `ov:${selectedOverlayId}:${mergeKey}` : undefined,
    );
  };
  const deleteOverlay = () => {
    if (!selectedOverlayId) return;
    history.set((p) => ({ ...p, overlays: (p.overlays ?? []).filter((o) => o.id !== selectedOverlayId) }));
    setSelectedOverlayId(null);
  };
  const duplicateOverlay = () => {
    if (!overlay) return;
    const copy = { ...structuredClone(overlay), id: uid(), at: overlay.at + overlay.duration };
    history.set((p) => ({ ...p, overlays: [...(p.overlays ?? []), copy] }));
    setSelectedOverlayId(copy.id);
  };

  const makeOverlayAt = (p: Project, payload: OverlayPayload, atFrame: number): Overlay | null => {
    const loc = locateFrame(p, atFrame);
    if (!loc) return null;
    const def = OVERLAYS[payload.kind];
    return {
      id: uid(),
      sceneId: loc.scene.id,
      at: Math.round(loc.at * 100) / 100,
      duration: def.duration,
      kind: payload.kind,
      position: def.position,
      size: def.size,
      props: { ...def.props, ...(payload.props ?? {}) },
    };
  };

  const addOverlay = (payload: OverlayPayload, atFrame = frame) => {
    const ov = makeOverlayAt(project, payload, atFrame);
    if (!ov) return;
    history.set({ ...project, overlays: [...(project.overlays ?? []), ov] });
    selectOverlay(ov.id);
    flash(`${OVERLAYS[payload.kind].name} inserido`);
  };

  const uploadImages = async (files: File[]) => {
    const added: NonNullable<Project["assets"]> = [];
    try {
      for (const [i, f] of files.entries()) {
        setUploading(`Enviando ${i + 1} de ${files.length}…`);
        const r = await uploadFile<{ kind: string; file: string; name: string }>(f);
        if (r.kind !== "image") continue;
        const size = await imageSize(`/media/${r.file}`);
        added.push({ id: uid(), file: r.file, name: r.name, ...size });
      }
      if (added.length) {
        history.set((p) => ({ ...p, assets: [...(p.assets ?? []), ...added] }));
        flash(`${added.length} imagem(ns) adicionada(s)`);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(null);
    }
  };

  const uploadBroll = async (files: File[]) => {
    const added: NonNullable<Project["assets"]> = [];
    try {
      for (const [i, f] of files.entries()) {
        setUploading(`Enviando B-Roll ${i + 1} de ${files.length}…`);
        const r = await uploadFile<{ kind: string; jobId?: string; file?: string; name?: string }>(f);
        if (r.kind === "video" && r.jobId) {
          const info = await pollJob<{ file: string; name: string; duration: number; width: number; height: number }>(r.jobId, (j) =>
            setUploading(`Processando B-Roll: ${j.stage} (${Math.round(j.progress * 100)}%)`),
          );
          added.push({
            id: uid(),
            file: info.file,
            name: info.name,
            width: info.width,
            height: info.height,
            kind: "video",
          });
        }
      }
      if (added.length) {
        history.set((p) => ({ ...p, assets: [...(p.assets ?? []), ...added] }));
        flash(`${added.length} vídeo(s) B-Roll adicionado(s)`);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(null);
    }
  };

  const removeAsset = (id: string) => {
    const used = (project.overlays ?? []).filter((o) => (o.kind === "image" || o.kind === "video") && o.props.assetId === id).length;
    if (used && !confirm(`Esse arquivo está em ${used} sobreposição(ões). Remover o arquivo e essas sobreposições?`)) return;
    history.set((p) => ({
      ...p,
      assets: (p.assets ?? []).filter((a) => a.id !== id),
      overlays: (p.overlays ?? []).filter((o) => !((o.kind === "image" || o.kind === "video") && o.props.assetId === id)),
    }));
  };

  const generateImage = async (prompt: string, aspect: "landscape" | "portrait" | "square", transparent: boolean, provider: "gemini" | "openai") => {
    setGenerating(true);
    try {
      const img = await postJson<{ file: string; width: number; height: number; provider: "gemini" | "openai" }>("/api/image", {
        prompt,
        aspect,
        transparent,
        provider,
      });
      const asset = {
        id: uid(),
        file: img.file,
        name: prompt.slice(0, 40),
        width: img.width,
        height: img.height,
        generated: true,
        prompt,
        provider: img.provider,
      };
      const base = { ...project, assets: [...(project.assets ?? []), asset] };
      const ov = makeOverlayAt(base, { kind: "image", props: { assetId: asset.id } }, frame);
      history.set(ov ? { ...base, overlays: [...(base.overlays ?? []), ov] } : base);
      if (ov) selectOverlay(ov.id);
      flash(`Imagem gerada com ${img.provider === "gemini" ? "Nano Banana" : "GPT Image"} e inserida`);
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  // ---------- Vídeo gravado ----------
  const importVideo = async (file: File) => {
    setImporting({ stage: "Enviando o vídeo", progress: 0 });
    try {
      const r = await uploadFile<{ kind: string; jobId?: string; file?: string; name?: string }>(file, (p) =>
        setImporting({ stage: "Enviando o vídeo", progress: p }),
      );
      if (r.kind === "image" && r.file) {
        const size = await imageSize(`/media/${r.file}`);
        history.set((p) => ({ ...p, assets: [...(p.assets ?? []), { id: uid(), file: r.file!, name: r.name ?? "imagem", ...size }] }));
        flash("Imagem adicionada à biblioteca");
        return;
      }
      const info = await pollJob<{ file: string; name: string; duration: number; width: number; height: number }>(r.jobId!, (j) =>
        setImporting({ stage: j.stage, progress: j.progress }),
      );
      const segments = [{ start: 0, end: info.duration }];
      const vs: VideoScene = {
        id: uid(),
        type: "video",
        duration: videoFrames(segments),
        file: info.file,
        name: info.name,
        srcDuration: info.duration,
        srcWidth: info.width,
        srcHeight: info.height,
        segments,
        words: [],
        fit: "cover",
        volume: 1,
      };
      const idx = project.scenes.findIndex((x) => x.id === selectedId);
      const scenes = [...project.scenes];
      scenes.splice(idx < 0 ? scenes.length : idx + 1, 0, vs);
      // Vídeo vertical num projeto horizontal recém-criado: sugere o formato certo
      const next = { ...project, scenes };
      history.set(next);
      selectScene(vs.id);
      requestAnimationFrame(() => seek(startOf(next, vs.id)));
      flash("Vídeo importado. Agora você pode transcrever, cortar pausas e inserir ilustrações.");
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(null);
    }
  };

  const importAudio = async (file: File) => {
    try {
      const r = await uploadFile<{ kind: string; file: string; name: string }>(file);
      history.set((p) => ({
        ...p,
        audio: {
          ...(p.audio ?? {
            enabled: true,
            preset: "custom" as const,
            volume: 0.3,
            loop: true,
            ducking: true,
            duckingVolume: 0.08,
            duckingRampMs: 250,
          }),
          enabled: true,
          preset: "custom",
          file: r.file,
          name: r.name,
        },
      }));
      flash(`Trilha sonora "${r.name}" adicionada ao projeto!`);
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e));
    }
  };

  const onDropFiles = (files: File[]) => {
    const audios = files.filter((f) => f.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name));
    const videos = files.filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name));
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (audios[0]) importAudio(audios[0]);
    if (videos[0]) importVideo(videos[0]);
    if (images.length) uploadImages(images);
  };

  // ---------- Edição por prompt ----------
  const runPrompt = async (message: string) => {
    setPromptBusy(true);
    setPromptStatus("Pensando…");
    playerRef.current?.pause();
    try {
      const loc = locateFrame(project, frame);
      const playhead = loc ? { sceneId: loc.scene.id, at: loc.at, isVideo: loc.scene.type === "video" } : null;
      const selection = overlay ? `ilustração ${overlay.id}` : scene ? `cena ${scene.id}` : null;
      const res = await postJson<{ reply: string; operations: AiOp[] }>("/api/prompt", {
        project: { ...project, mediaBase: undefined },
        message,
        history: promptHistory.filter((h) => !h.error).slice(-6).map((h) => ({ message: h.message, reply: h.reply })),
        playhead,
        selection,
      });
      setPromptStatus(res.operations.length ? "Aplicando as mudanças…" : null);
      const { project: next, notes } = await applyOps(project, res.operations, { onStatus: setPromptStatus });
      if (res.operations.length) history.set(next);
      setPromptHistory((h) => [...h, { message, reply: res.reply || "Feito.", notes }]);
    } catch (e) {
      setPromptHistory((h) => [...h, { message, reply: e instanceof Error ? e.message : String(e), error: true }]);
    } finally {
      setPromptBusy(false);
      setPromptStatus(null);
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        if (isTyping(e.target)) return;
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        if (isTyping(e.target)) return;
        e.preventDefault();
        history.redo();
        return;
      }
      if (isTyping(e.target)) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateScene();
      } else if (!mod && (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "c")) {
        e.preventDefault();
        splitSceneAtPlayhead();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedOverlayId) deleteOverlay();
        else deleteScene();
      } else if (e.key === "Escape") {
        setSelectedOverlayId(null);
      } else if (e.key === "ArrowLeft") {
        seek(frame - (e.shiftKey ? FPS : 1));
      } else if (e.key === "ArrowRight") {
        seek(frame + (e.shiftKey ? FPS : 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const saveJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug(project.name)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    flash("Projeto salvo");
  };

  const openJson = async (file: File) => {
    try {
      const p = JSON.parse(await file.text()) as Project;
      if (!Array.isArray(p.scenes) || !p.scenes.length || !p.theme) throw new Error("formato");
      history.reset(normalizeProject(p));
      setSelectedId(p.scenes[0].id);
      seek(0);
      flash(`Aberto: ${p.name}`);
    } catch {
      flash("Esse arquivo não é um projeto válido");
    }
  };

  const newProject = () => {
    if (!confirm("Começar um projeto novo? O atual continua no histórico (Desfazer) até você recarregar a página.")) return;
    const p = defaultProject();
    history.set(p);
    setSelectedId(p.scenes[0].id);
    seek(0);
  };

  // 1-Click Repurposing: converte qualquer formato para 9:16 com retention kit
  const repurposeForSocial = () => {
    setShowSafeZones(true);
    const nextScenes = project.scenes.map((s) => {
      if (s.type === "video") {
        return {
          ...s,
          bgMode: (s.srcWidth > s.srcHeight ? "blur" : (s.bgMode ?? "cover")) as "blur" | "cover" | "contain" | "black",
          punchInPattern: (s.punchInPattern === "none" || !s.punchInPattern ? "alternate" : s.punchInPattern) as "none" | "alternate" | "manual",
          punchInZoom: s.punchInZoom ?? 1.2,
        };
      }
      return s;
    });

    const nextCaptions = {
      ...DEFAULT_CAPTIONS,
      ...(project.captions ?? {}),
      enabled: true,
      offsetY: 74,
    };

    const nextProgressBar = {
      ...DEFAULT_PROGRESS_BAR,
      ...(project.progressBar ?? {}),
      enabled: true,
      position: "bottom" as const,
      height: 6,
    };

    history.set({
      ...project,
      format: "portrait",
      scenes: nextScenes,
      captions: nextCaptions,
      progressBar: nextProgressBar,
    });

    flash("Vídeo reproveitado para 9:16 (Smart Reframe Blur, Safe Zones, Punch-in e Barra de Retenção ativados)!");
  };

  const adjustFormat = (targetFormat: FormatId) => {
    if (targetFormat === "portrait") {
      repurposeForSocial();
    } else {
      history.set({ ...project, format: targetFormat });
      flash(`Formato ajustado para ${FORMATS[targetFormat].label}`);
    }
  };

  // Exportação: o servidor local renderiza o MP4 com a mesma composição
  const exportMp4 = async () => {
    playerRef.current?.pause();
    setExp({ status: "running", id: "", progress: 0, stage: "Preparando" });
    try {
      const r = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Erro ${r.status}`);
      const { id } = (await r.json()) as { id: string };
      const poll = async (): Promise<void> => {
        const s = await fetch(`/api/render/${id}`).then((x) => x.json());
        if (s.status === "done") {
          setExp({ status: "done", id, file: s.file });
          return;
        }
        if (s.status === "error") throw new Error(s.error);
        setExp({ status: "running", id, progress: s.progress ?? 0, stage: s.stage ?? "Renderizando" });
        await new Promise((res) => setTimeout(res, 500));
        return poll();
      };
      await poll();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setExp({
        status: "error",
        message: msg.includes("Failed to fetch") || msg.includes("500") || msg.includes("502")
          ? "O servidor de exportação não respondeu. Use o iniciar.bat ou npm run dev."
          : msg,
      });
    }
  };

  // Passar o mouse num efeito da biblioteca mostra uma prévia sem alterar o projeto
  const inputProps = useMemo(() => {
    if (!hoverFx) return project;
    if (hoverFx.kind === "transition" && isLastScene) return project;
    return selectedId ? withFx(project, hoverFx, "scene", selectedId) : withFx(project, hoverFx, "global", null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, hoverFx, selectedId, isLastScene]);

  const previewTotal = totalFrames(inputProps);

  // Leva o cursor até onde a prévia do efeito aparece
  useEffect(() => {
    if (!hoverFx || playing || sceneIndex < 0) return;
    const st = sceneStarts(inputProps.scenes);
    if (hoverFx.kind === "transition") {
      const t = transitionFrames(inputProps.scenes, sceneIndex);
      if (t > 0) seek(st[sceneIndex + 1] + Math.round(t / 2));
    } else {
      const s0 = st[sceneIndex];
      const d = inputProps.scenes[sceneIndex].duration;
      if (frame < s0 || frame >= s0 + d) seek(s0 + Math.min(45, Math.round(d * 0.5)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverFx]);

  const sceneStart = sceneIndex >= 0 ? sceneStarts(project.scenes)[sceneIndex] : 0;
  const sourceTime =
    scene?.type === "video" && frame >= sceneStart && frame < sceneStart + scene.duration
      ? localToSource(scene.segments, (frame - sceneStart) / FPS)
      : null;

  return (
    <div
      className="app"
      style={{ gridTemplateRows: `56px minmax(0, 1fr) ${layout.timeline}px` }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.relatedTarget) setDragOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragOver(false);
        onDropFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden />
          <input
            className="title-input"
            value={project.name}
            aria-label="Nome do projeto"
            onChange={(e) => updateProject({ name: e.target.value }, "name")}
          />
        </div>
        <div className="top-actions">
          <button className="btn ghost" onClick={newProject}>
            Novo
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Abrir
          </button>
          <button className="btn ghost" onClick={saveJson}>
            Salvar
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) openJson(f);
              e.target.value = "";
            }}
          />
          <button className="btn ghost" onClick={() => videoInputRef.current?.click()} disabled={!!importing}>
            Importar vídeo
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*,.mov,.mkv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importVideo(f);
              e.target.value = "";
            }}
          />
          <button className="btn icon ghost" onClick={() => setSettingsOpen(true)} aria-label="Configurações" title="Configurações">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </button>
          <span className="sep" />
          <button
            type="button"
            className="btn ghost"
            onClick={() => setHighlightsOpen(true)}
            title="Extrair melhores momentos para Shorts com IA (Opus Clip local)"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <Flame size={15} style={{ marginRight: 6, color: "#f97316" }} />
            Melhores Momentos
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setSocialCopyOpen(true)}
            title="Gerar legendas, ganchos e hashtags para TikTok, Reels e Shorts"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <Share2 size={15} style={{ marginRight: 6, color: "#a855f7" }} />
            Copy & SEO
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setCoverModalOpen(true)}
            title="Criador de capa viral e título no primeiro frame (Thumbnail)"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <ImageIcon size={15} style={{ marginRight: 6, color: "#38bdf8" }} />
            Capa do Vídeo
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => setExportModalOpen(true)}
            title="Abrir opções de exportação para Reels, TikTok, Shorts e redes sociais"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <Download size={15} style={{ marginRight: 6 }} />
            Exportar Vídeo…
          </button>
        </div>
      </header>

      <main className="workspace" style={{ gridTemplateColumns: `${layout.left}px minmax(0, 1fr) ${layout.right}px` }}>
        <Library
          hasScene={!!scene}
          isLastScene={isLastScene}
          onApplyFx={(fx, target) => applyFx(fx, target)}
          onHoverFx={setHoverFx}
          assets={project.assets ?? []}
          imageKeys={{
            gemini: !!config?.hasGeminiKey,
            openai: !!config?.hasOpenaiKey,
            preferred: config?.imageProvider === "openai" ? "openai" : "gemini",
          }}
          generating={generating}
          uploading={uploading}
          words={scene?.type === "video" ? scene.words : project.scenes.find((s): s is VideoScene => s.type === "video")?.words}
          onAddOverlay={(p) => addOverlay(p)}
          onAddAsset={(a) => history.set((p) => ({ ...p, assets: [...(p.assets ?? []), a] }))}
          onUpload={uploadImages}
          onUploadBroll={uploadBroll}
          onGenerate={generateImage}
          onRemoveAsset={removeAsset}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <div className="center-col">
        <div className="stage" ref={stageRef}>
          <div className="player-frame" style={{ width: stage.w, height: stage.h, position: "relative" }}>
            <Player
              ref={playerRef}
              component={Video}
              inputProps={inputProps}
              durationInFrames={previewTotal}
              compositionWidth={fmt.width}
              compositionHeight={fmt.height}
              fps={FPS}
              style={{ width: "100%", height: "100%" }}
              clickToPlay
              doubleClickToFullscreen
              spaceKeyToPlayOrPause={false}
              acknowledgeRemotionLicense
            />
            {showSafeZones && project.format === "portrait" ? <SafeZonesOverlay /> : null}
          </div>
          <span className="stage-info">
            {fmt.width}×{fmt.height} · {FPS} fps · {project.scenes.length} cenas
            {project.format === "portrait" ? (
              <>
                {" · "}
                <button
                  type="button"
                  className={`stage-safe-toggle ${showSafeZones ? "active" : ""}`}
                  onClick={() => setShowSafeZones(!showSafeZones)}
                  title="Alternar guia de margens do TikTok e Instagram Reels"
                  style={{ display: "inline-flex", alignItems: "center" }}
                >
                  <Shield size={13} style={{ marginRight: 4 }} />
                  Safe Zones {showSafeZones ? "ON" : "OFF"}
                </button>
              </>
            ) : (
              <>
                {" · "}
                <button
                  type="button"
                  className="stage-safe-toggle highlight"
                  onClick={repurposeForSocial}
                  title="Converter para Reels/TikTok 9:16 com Smart Reframe e Safe Zones"
                  style={{ display: "inline-flex", alignItems: "center" }}
                >
                  <Sparkles size={13} style={{ marginRight: 4 }} />
                  Reproveitar 9:16
                </button>
              </>
            )}
          </span>
          {importing ? (
            <div className="import-overlay" role="status">
              <span>{importing.stage}</span>
              <span className="bar">
                <span style={{ transform: `scaleX(${Math.max(0.03, importing.progress)})` }} />
              </span>
            </div>
          ) : null}
        </div>
        <PromptBar
          busy={promptBusy}
          status={promptStatus}
          history={promptHistory}
          hasKey={config?.promptProvider === "claude-code" || !!config?.hasAnthropicKey}
          hasVideo={hasVideo}
          canUndo={history.canUndo}
          onSubmit={runPrompt}
          onUndo={history.undo}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        </div>
        <Inspector
          project={project}
          scene={scene}
          isLastScene={isLastScene}
          tab={inspectorTab}
          onTab={setInspectorTab}
          onScene={updateScene}
          onProject={updateProject}
          onRepurposeForSocial={repurposeForSocial}
          flash={flash}
          overlayPanel={
            overlay ? (
              <OverlayInspector overlay={overlay} project={project} onChange={updateOverlay} onDelete={deleteOverlay} onDuplicate={duplicateOverlay} />
            ) : undefined
          }
          videoPanel={
            scene?.type === "video" ? (
              <VideoPanel
                key={scene.id}
                scene={scene}
                project={project}
                sourceTime={sourceTime}
                onScene={updateScene}
                onProject={updateProject}
                onSeekSource={(t) => {
                  const l = sourceToLocal(scene.segments, t) ?? 0;
                  seek(sceneStart + Math.round(l * FPS));
                }}
                flash={flash}
                aiReady={config?.promptProvider === "claude-code" || !!config?.hasAnthropicKey}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ) : undefined
          }
        />
      </main>

      <ResizeHandle
        kind="left"
        label="Largura da biblioteca"
        value={layout.left}
        style={{ top: 56, bottom: layout.timeline, left: layout.left - 4 }}
        onChange={(v) => setLayout({ left: v })}
        onReset={() => resetLayout("left")}
      />
      <ResizeHandle
        kind="right"
        label="Largura do painel de propriedades"
        value={layout.right}
        style={{ top: 56, bottom: layout.timeline, right: layout.right - 4 }}
        onChange={(v) => setLayout({ right: v })}
        onReset={() => resetLayout("right")}
      />
      <ResizeHandle
        kind="timeline"
        label="Altura da linha do tempo"
        value={layout.timeline}
        style={{ left: 0, right: 0, bottom: layout.timeline - 4 }}
        onChange={(v) => setLayout({ timeline: v })}
        onReset={() => resetLayout("timeline")}
      />

      <Timeline
        project={project}
        frame={frame}
        playing={playing}
        selectedId={selectedOverlayId ? null : selectedId}
        onSelect={selectScene}
        onSeek={seek}
        onTogglePlay={togglePlay}
        onPreview={history.preview}
        onCommitFrom={history.commitFrom}
        onAdd={addScene}
        onDuplicate={duplicateScene}
        onDelete={deleteScene}
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onDropFx={(id, fx) => applyFx(fx, "scene", id)}
        selectedOverlayId={selectedOverlayId}
        onSelectOverlay={selectOverlay}
        onDropOverlay={(f, payload) => addOverlay(payload, f)}
        onImportVideo={() => videoInputRef.current?.click()}
        onSplit={splitSceneAtPlayhead}
        canSplit={canSplit}
      />

      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} onSaved={setConfig} />

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        project={project}
        onAdjustFormat={adjustFormat}
        onOpenSocialCopy={() => setSocialCopyOpen(true)}
        flash={flash}
      />

      <HighlightsModal
        open={highlightsOpen}
        onClose={() => setHighlightsOpen(false)}
        project={project}
        onApplyHighlight={handleApplyHighlight}
        onPreviewTime={handlePreviewTime}
      />

      <SocialCopyModal
        open={socialCopyOpen}
        onClose={() => setSocialCopyOpen(false)}
        project={project}
      />

      <CoverModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        project={project}
        onUpdateProject={history.set}
      />

      {dragOver ? (
        <div className="drop-overlay">
          <span>Solte o vídeo ou as imagens para importar</span>
        </div>
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button className="link" onClick={() => setToast(null)} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
};

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "video";

const ExportButton: React.FC<{ state: ExportState; onExport: () => void; onDismiss: () => void }> = ({ state, onExport, onDismiss }) => {
  if (state.status === "running") {
    const pct = Math.round(state.progress * 100);
    return (
      <div className="export-progress" role="status" aria-live="polite">
        <span>
          {state.stage} {pct > 0 ? `${pct}%` : ""}
        </span>
        <span className="bar">
          <span style={{ transform: `scaleX(${state.progress})` }} />
        </span>
      </div>
    );
  }
  if (state.status === "done") {
    return (
      <div className="export-done">
        <a className="btn primary" href={`/api/download/${state.id}`} download={state.file}>
          Baixar MP4
        </a>
        <button className="btn ghost" onClick={onDismiss}>
          Fechar
        </button>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="export-error" role="alert">
        <span title={state.message}>{state.message}</span>
        <button className="btn ghost" onClick={onDismiss}>
          Ok
        </button>
      </div>
    );
  }
  return (
    <button className="btn primary" onClick={onExport}>
      Exportar MP4
    </button>
  );
};
