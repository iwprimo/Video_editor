// Executa as operações devolvidas pela edição por prompt.
// Tudo vira um único passo no histórico, então "Desfazer" reverte o pedido inteiro.
import {
  DEFAULT_CAPTIONS,
  DEFAULT_TRANSITION,
  EFFECTS,
  EffectType,
  FPS,
  MAX_SCENE_FRAMES,
  MAX_TRANSITION_FRAMES,
  MIN_SCENE_FRAMES,
  MIN_TRANSITION_FRAMES,
  OVERLAYS,
  OverlayKind,
  OverlayPosition,
  POSITIONS,
  Project,
  Scene,
  SceneType,
  THEME_PRESETS,
  TRANSITIONS,
  TransitionType,
  CAPTION_STYLES,
  FORMATS,
  cutRange,
  makeEffect,
  makeScene,
  normalizeSegments,
  restoreRange,
  uid,
  withVideoDuration,
} from "../remotion/types";
import { postJson } from "./api";

export type AiOp = {
  op: string;
  sceneId: string;
  targetId: string;
  start: number;
  end: number;
  text: string;
  args: Record<string, any>;
};

type Ctx = { onStatus?: (s: string) => void };

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export const applyOps = async (input: Project, ops: AiOp[], ctx: Ctx = {}) => {
  let p: Project = structuredClone(input);
  const notes: string[] = [];
  const scene = (id: string) => p.scenes.find((s) => s.id === id);
  const setScene = (id: string, fn: (s: Scene) => Scene) => {
    p = { ...p, scenes: p.scenes.map((s) => (s.id === id ? withVideoDuration(fn(s)) : s)) };
  };

  let imageCount = 0;
  const totalImages = ops.filter((o) => o.op === "generate_image").length;

  for (const o of ops) {
    const a = o.args ?? {};
    try {
      switch (o.op) {
        case "cut":
        case "restore": {
          const s = scene(o.sceneId);
          if (s?.type !== "video" || !isNum(o.start) || !isNum(o.end) || o.end <= o.start) {
            notes.push(`Corte ignorado (cena ou tempos inválidos)`);
            break;
          }
          setScene(s.id, (x) =>
            x.type === "video"
              ? {
                  ...x,
                  segments:
                    o.op === "cut"
                      ? normalizeSegments(cutRange(x.segments, o.start, o.end), x.srcDuration)
                      : restoreRange(x.segments, o.start, o.end, x.srcDuration),
                }
              : x,
          );
          break;
        }
        case "remove_silences": {
          const s = scene(o.sceneId);
          if (s?.type !== "video") break;
          ctx.onStatus?.("Detectando silêncios…");
          const { cuts } = await postJson<{ cuts: { start: number; end: number }[] }>("/api/silences", {
            file: s.file,
            threshold: a.threshold ?? -35,
            minSilence: a.minSilence ?? 0.6,
            padding: a.padding ?? 0.15,
          });
          setScene(s.id, (x) => {
            if (x.type !== "video") return x;
            let segs = x.segments;
            for (const c of cuts) segs = cutRange(segs, c.start, c.end);
            return { ...x, segments: normalizeSegments(segs, x.srcDuration) };
          });
          break;
        }
        case "captions": {
          const c = { ...DEFAULT_CAPTIONS, ...(p.captions ?? { enabled: false }) };
          if (typeof a.enabled === "boolean") c.enabled = a.enabled;
          if (a.style in CAPTION_STYLES) c.style = a.style;
          if (["bottom", "middle", "top"].includes(a.position)) c.position = a.position;
          if (typeof a.color === "string" && /^#[0-9a-f]{6}$/i.test(a.color)) c.color = a.color;
          if (isNum(a.size)) c.size = clamp(a.size, 0.6, 1.8);
          if (typeof a.uppercase === "boolean") c.uppercase = a.uppercase;
          if (isNum(a.wordsPerPage)) c.wordsPerPage = clamp(Math.round(a.wordsPerPage), 1, 12);
          p = { ...p, captions: c };
          break;
        }
        case "edit_word": {
          const s = scene(o.sceneId);
          if (s?.type !== "video" || !s.words || !o.text) break;
          let best = -1;
          let dist = Infinity;
          s.words.forEach((w, i) => {
            const d = Math.abs(w.start - o.start);
            if (d < dist) {
              dist = d;
              best = i;
            }
          });
          if (best >= 0 && dist < 0.6) {
            setScene(s.id, (x) =>
              x.type === "video" && x.words ? { ...x, words: x.words.map((w, i) => (i === best ? { ...w, text: o.text } : w)) } : x,
            );
          }
          break;
        }
        case "add_overlay": {
          const s = scene(o.sceneId);
          const kind = a.kind as OverlayKind;
          if (!s || !(kind in OVERLAYS)) {
            notes.push("Ilustração ignorada (cena ou tipo inválido)");
            break;
          }
          if ((kind === "image" || kind === "video") && !p.assets?.some((x) => x.id === a.props?.assetId)) {
            notes.push("Mídia/B-Roll ignorado (arquivo não encontrado)");
            break;
          }
          const def = OVERLAYS[kind];
          const at = isNum(o.start) && o.start >= 0 ? o.start : 0;
          const duration = isNum(o.end) && o.end > at ? o.end - at : def.duration;
          p = {
            ...p,
            overlays: [
              ...(p.overlays ?? []),
              {
                id: uid(),
                sceneId: s.id,
                at,
                duration: clamp(duration, 0.5, 60),
                kind,
                position: (a.position in POSITIONS ? a.position : def.position) as OverlayPosition,
                size: isNum(a.size) ? clamp(a.size, 0.12, 1) : def.size,
                props: { ...def.props, ...(a.props ?? {}) },
              },
            ],
          };
          break;
        }
        case "update_overlay": {
          p = {
            ...p,
            overlays: (p.overlays ?? []).map((ov) => {
              if (ov.id !== o.targetId) return ov;
              const at = isNum(o.start) && o.start >= 0 ? o.start : ov.at;
              const duration = isNum(o.end) && o.end > at ? o.end - at : ov.duration;
              return {
                ...ov,
                at,
                duration,
                position: a.position in POSITIONS ? a.position : ov.position,
                size: isNum(a.size) ? clamp(a.size, 0.12, 1) : ov.size,
                props: { ...ov.props, ...(a.props ?? {}) },
              };
            }),
          };
          break;
        }
        case "remove_overlay":
          p = { ...p, overlays: (p.overlays ?? []).filter((ov) => ov.id !== o.targetId) };
          break;
        case "generate_image": {
          const s = scene(o.sceneId);
          if (!s || !o.text) break;
          imageCount++;
          ctx.onStatus?.(`Gerando imagem ${imageCount} de ${totalImages}…`);
          const aspect = ["landscape", "portrait", "square"].includes(a.aspect) ? a.aspect : "landscape";
          const img = await postJson<{ file: string; width: number; height: number; provider?: "gemini" | "openai" }>("/api/image", {
            prompt: o.text,
            aspect,
            transparent: !!a.transparent,
          });
          const asset = {
            id: uid(),
            file: img.file,
            name: o.text.slice(0, 40),
            width: img.width,
            height: img.height,
            generated: true,
            prompt: o.text,
            provider: img.provider,
          };
          const at = isNum(o.start) && o.start >= 0 ? o.start : 0;
          p = {
            ...p,
            assets: [...(p.assets ?? []), asset],
            overlays: [
              ...(p.overlays ?? []),
              {
                id: uid(),
                sceneId: s.id,
                at,
                duration: isNum(o.end) && o.end > at ? o.end - at : 4,
                kind: "image",
                position: (a.position in POSITIONS ? a.position : "right") as OverlayPosition,
                size: isNum(a.size) ? clamp(a.size, 0.12, 1) : 0.55,
                props: { ...OVERLAYS.image.props, assetId: asset.id },
              },
            ],
          };
          break;
        }
        case "add_scene": {
          const type = a.type as SceneType;
          if (!["title", "chart", "stats", "text", "outro"].includes(type)) break;
          const base = makeScene(type);
          const ns = {
            ...base,
            ...(a.fields ?? {}),
            id: base.id,
            type,
            duration: isNum(a.duration) ? clamp(Math.round(a.duration * FPS), MIN_SCENE_FRAMES, MAX_SCENE_FRAMES) : base.duration,
          } as Scene;
          const idx = p.scenes.findIndex((s) => s.id === a.after);
          const scenes = [...p.scenes];
          scenes.splice(idx < 0 ? scenes.length : idx + 1, 0, ns);
          p = { ...p, scenes };
          break;
        }
        case "update_scene": {
          const s = scene(o.sceneId);
          if (!s) break;
          setScene(s.id, (x) => {
            const fields = { ...(a.fields ?? {}) };
            delete fields.id;
            delete fields.type;
            if (x.type === "video") {
              const next = { ...x };
              if (fields.fit === "cover" || fields.fit === "contain") next.fit = fields.fit;
              if (isNum(fields.volume)) next.volume = clamp(fields.volume, 0, 1);
              return next;
            }
            const next = { ...x, ...fields } as Scene;
            if (isNum(a.duration)) next.duration = clamp(Math.round(a.duration * FPS), MIN_SCENE_FRAMES, MAX_SCENE_FRAMES);
            return next;
          });
          break;
        }
        case "remove_scene":
          if (p.scenes.length > 1) {
            p = { ...p, scenes: p.scenes.filter((s) => s.id !== o.sceneId), overlays: (p.overlays ?? []).filter((ov) => ov.sceneId !== o.sceneId) };
          }
          break;
        case "move_scene": {
          const idx = p.scenes.findIndex((s) => s.id === o.sceneId);
          if (idx < 0 || !isNum(a.toIndex)) break;
          const scenes = [...p.scenes];
          const [s] = scenes.splice(idx, 1);
          scenes.splice(clamp(Math.round(a.toIndex), 0, scenes.length), 0, s);
          p = { ...p, scenes };
          break;
        }
        case "add_effect": {
          const type = a.type as EffectType;
          if (!(type in EFFECTS)) break;
          const fx = makeEffect(type, isNum(a.intensity) ? clamp(a.intensity, 0.05, 1) : undefined);
          if (!o.sceneId) {
            const list = (p.effects ?? []).filter((e) => e.type !== type);
            p = { ...p, effects: [...list, fx] };
          } else if (scene(o.sceneId)) {
            setScene(o.sceneId, (x) => ({ ...x, effects: [...(x.effects ?? []).filter((e) => e.type !== type), fx] }));
          }
          break;
        }
        case "remove_effect": {
          if (!o.sceneId) p = { ...p, effects: (p.effects ?? []).filter((e) => e.type !== a.type) };
          else setScene(o.sceneId, (x) => ({ ...x, effects: (x.effects ?? []).filter((e) => e.type !== a.type) }));
          break;
        }
        case "set_transition": {
          const type = a.type as TransitionType;
          if (!scene(o.sceneId) || !(type in TRANSITIONS)) break;
          setScene(o.sceneId, (x) => ({
            ...x,
            transition: {
              ...(x.transition ?? DEFAULT_TRANSITION),
              type,
              direction: ["from-left", "from-right", "from-top", "from-bottom"].includes(a.direction) ? a.direction : x.transition?.direction ?? "from-right",
              duration: isNum(a.duration) ? clamp(Math.round(a.duration * FPS), MIN_TRANSITION_FRAMES, MAX_TRANSITION_FRAMES) : x.transition?.duration ?? 18,
            },
          }));
          break;
        }
        case "set_project": {
          if (typeof a.name === "string" && a.name.trim()) p = { ...p, name: a.name.trim() };
          if (a.format in FORMATS) p = { ...p, format: a.format };
          const preset = THEME_PRESETS.find((t) => t.name.toLowerCase() === String(a.theme ?? "").toLowerCase());
          if (preset) p = { ...p, theme: preset.theme };
          break;
        }
        default:
          break;
      }
    } catch (e) {
      notes.push(e instanceof Error ? e.message : String(e));
    }
  }
  return { project: p, notes };
};
