import React, { createContext, useContext, useEffect, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  getRemotionEnvironment,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { EffectsLayer, makePresentation } from "./effects";
import { CaptionsLayer, OverlaysLayer } from "./overlays";
import { HeadlineLayer } from "./HeadlineLayer";
import { AudioLayer } from "./AudioLayer";
import { FPS, normalizeProject, segFrames, transitionFrames, totalFrames } from "./types";
import type { ChartScene, ImageAsset, OutroScene, Project, Scene, StatsScene, TextScene, Theme, TitleScene, VideoScene } from "./types";

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const alpha = (hex: string, a: number) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// Escala tudo a partir do menor lado do quadro (1080 = 1x)
const useUnit = () => {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  return { u, width, height, portrait: height > width, pad: Math.round(110 * u) };
};

// Quando a cena sai por uma transição, a própria transição cuida da saída
const ExitContext = createContext(true);

// Fade de saída nos últimos quadros da cena (só em corte seco)
const useExit = (duration: number, from = 12, to = 2) => {
  const frame = useCurrentFrame();
  const enabled = useContext(ExitContext);
  return enabled ? interpolate(frame, [duration - from, duration - to], [1, 0], clamp) : 1;
};

// Entrada (sobe e aparece) + saída automática no fim da cena
const useReveal = (delay: number, duration: number, distance = 48) => {
  const frame = useCurrentFrame();
  const { u } = useUnit();
  const t = interpolate(frame, [delay, delay + 18], [0, 1], { ...clamp, easing: easeOut });
  const exit = useExit(duration);
  return {
    opacity: t * exit,
    transform: `translateY(${((1 - t) * distance - (1 - exit) * 20) * u}px)`,
  };
};

const formatNumber = (n: number, decimals: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const Highlighted: React.FC<{ text: string; highlight: string; color: string }> = ({ text, highlight, color }) => {
  const idx = highlight ? text.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color }}>{text.slice(idx, idx + highlight.length)}</span>
      {text.slice(idx + highlight.length)}
    </>
  );
};

const Center: React.FC<{ children: React.ReactNode; pad: number }> = ({ children, pad }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: pad, textAlign: "center" }}>
    {children}
  </AbsoluteFill>
);

const TitleView: React.FC<{ s: TitleScene; t: Theme }> = ({ s, t }) => {
  const { u, pad, portrait } = useUnit();
  const k = useReveal(4, s.duration);
  const h = useReveal(10, s.duration, 60);
  return (
    <Center pad={pad}>
      {s.kicker ? (
        <div
          style={{
            ...k,
            fontSize: 30 * u,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: t.muted,
            marginBottom: 40 * u,
          }}
        >
          {s.kicker}
        </div>
      ) : null}
      <div
        style={{
          ...h,
          fontSize: (portrait ? 120 : 136) * u,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.08,
          maxWidth: portrait ? "100%" : "80%",
          textWrap: "balance",
        }}
      >
        <Highlighted text={s.title} highlight={s.highlight} color={t.accent} />
      </div>
    </Center>
  );
};

const ChartView: React.FC<{ s: ChartScene; t: Theme }> = ({ s, t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, pad, width, height, portrait } = useUnit();
  const header = useReveal(0, s.duration);
  const exit = useExit(s.duration);
  const data = s.data.length ? s.data : [{ label: "—", value: 0 }];
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = Math.max(...data.map((d) => d.value));
  const n = data.length;
  const avail = width - pad * 2;
  const barW = Math.min(170 * u, avail / (n + (n - 1) * 0.4));
  const gap = barW * 0.4;
  const chartH = (portrait ? height * 0.42 : height * 0.42) * 1;
  const valueSize = Math.min(48 * u, barW * 0.42);
  const labelSize = Math.min(40 * u, barW * 0.36);

  return (
    <Center pad={pad}>
      <div style={{ ...header, fontSize: 64 * u, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 16 * u }}>
        {s.title}
      </div>
      {s.subtitle ? (
        <div style={{ ...header, fontSize: 40 * u, fontWeight: 500, color: t.muted, marginBottom: 64 * u }}>
          {s.subtitle}
        </div>
      ) : (
        <div style={{ height: 48 * u }} />
      )}
      <div
        style={{
          opacity: exit,
          display: "flex",
          alignItems: "flex-end",
          gap,
          height: chartH + valueSize + 24 * u,
          borderBottom: `${Math.max(1, 2 * u)}px solid ${t.rule}`,
        }}
      >
        {data.map((d, i) => {
          const sp = spring({ frame: frame - 8 - i * 5, fps, config: { damping: 18, stiffness: 120 } });
          const shown = Math.min(1, sp);
          const isTop = d.value === top;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: barW }}>
              <div
                style={{
                  fontSize: valueSize,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: 14 * u,
                  opacity: shown,
                  color: isTop ? t.accent : t.ink,
                  whiteSpace: "nowrap",
                }}
              >
                {formatNumber(d.value * shown, Number.isInteger(d.value) ? 0 : 1)}
                {s.unit}
              </div>
              <div
                style={{
                  width: barW,
                  height: Math.max(0, (d.value / max) * chartH * sp),
                  borderRadius: `${14 * u}px ${14 * u}px 0 0`,
                  background: isTop ? t.accent : t.rule,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ opacity: exit, display: "flex", gap, marginTop: 20 * u }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              width: barW,
              textAlign: "center",
              fontSize: labelSize,
              fontWeight: 500,
              color: t.muted,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </Center>
  );
};

const StatsView: React.FC<{ s: StatsScene; t: Theme }> = ({ s, t }) => {
  const frame = useCurrentFrame();
  const { u, pad, portrait } = useUnit();
  const header = useReveal(0, s.duration);
  const exit = useExit(s.duration);
  const n = Math.max(1, s.stats.length);
  return (
    <Center pad={pad}>
      {s.title ? (
        <div
          style={{ ...header, fontSize: 64 * u, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 80 * u }}
        >
          {s.title}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", alignItems: "stretch" }}>
        {s.stats.map((st, i) => {
          const start = 6 + i * 5;
          const appear = interpolate(frame, [start, start + 18], [0, 1], { ...clamp, easing: easeOut });
          const count = interpolate(frame, [start, start + 45], [0, 1], { ...clamp, easing: easeOut });
          const divider = i > 0 ? `${Math.max(1, 2 * u)}px solid ${t.rule}` : "none";
          return (
            <div
              key={i}
              style={{
                opacity: appear * exit,
                transform: `translateY(${(1 - appear) * 40 * u}px)`,
                padding: portrait ? `${36 * u}px ${24 * u}px` : `${24 * u}px ${Math.max(32, 160 / n) * u}px`,
                borderLeft: portrait ? "none" : divider,
                borderTop: portrait ? divider : "none",
                minWidth: portrait ? 0 : 380 * u,
              }}
            >
              <div
                style={{
                  fontSize: (n > 3 ? 100 : 128) * u,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {formatNumber(st.value * count, st.decimals)}
                <span style={{ fontSize: (n > 3 ? 44 : 56) * u, fontWeight: 600, color: t.accent }}>{st.suffix}</span>
              </div>
              <div style={{ marginTop: 22 * u, fontSize: 34 * u, fontWeight: 500, color: t.muted }}>{st.label}</div>
            </div>
          );
        })}
      </div>
    </Center>
  );
};

const TextView: React.FC<{ s: TextScene; t: Theme }> = ({ s, t }) => {
  const frame = useCurrentFrame();
  const { u, pad, portrait } = useUnit();
  const exit = useExit(s.duration);
  const words = s.text.split(/\s+/).filter(Boolean);
  const author = useReveal(10 + words.length * 3, s.duration);
  return (
    <Center pad={pad}>
      <div
        style={{
          fontSize: (portrait ? 84 : 92) * u,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1.18,
          maxWidth: portrait ? "100%" : "78%",
          textWrap: "balance",
          opacity: exit,
        }}
      >
        {words.map((w, i) => {
          const a = interpolate(frame, [6 + i * 3, 6 + i * 3 + 12], [0, 1], { ...clamp, easing: easeOut });
          return (
            <span key={i} style={{ display: "inline-block", opacity: 0.18 + 0.82 * a, marginRight: "0.26em" }}>
              {w}
            </span>
          );
        })}
      </div>
      {s.author ? (
        <div style={{ ...author, marginTop: 48 * u, fontSize: 40 * u, fontWeight: 500, color: t.accent }}>
          {s.author}
        </div>
      ) : null}
    </Center>
  );
};

const OutroView: React.FC<{ s: OutroScene; t: Theme }> = ({ s, t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, pad, portrait } = useUnit();
  const sp = spring({ frame, fps, config: { damping: 200 } });
  const exit = useExit(s.duration, 8, 0);
  const tag = useReveal(12, s.duration + 100);
  return (
    <Center pad={pad}>
      <div
        style={{
          opacity: sp * exit,
          transform: `scale(${0.94 + 0.06 * sp})`,
          fontSize: (portrait ? 140 : 176) * u,
          fontWeight: 800,
          letterSpacing: "-0.05em",
          lineHeight: 1.05,
        }}
      >
        {s.brand}
        <span style={{ color: t.accent }}>.</span>
      </div>
      {s.tag ? (
        <div style={{ ...tag, opacity: tag.opacity * exit, fontSize: 44 * u, fontWeight: 500, color: t.muted, marginTop: 24 * u }}>
          {s.tag}
        </div>
      ) : null}
    </Center>
  );
};

// Gravação importada: cada trecho mantido toca do arquivo original, com fade curto no áudio para o corte não estalar
const VideoView: React.FC<{ s: VideoScene; mediaBase: string; theme?: Theme; assets?: ImageAsset[] }> = ({
  s,
  mediaBase,
  theme,
  assets,
}) => {
  const src = `${mediaBase}/media/${s.file}`;
  const [failed, setFailed] = useState(false);
  // Na prévia, um erro de reprodução não derruba o editor; na exportação ele deve aparecer
  const onError = getRemotionEnvironment().isPlayer ? () => setFailed(true) : undefined;
  const { portrait } = useUnit();

  const isHorizontal = s.srcWidth > s.srcHeight;
  const effectiveBgMode = s.bgMode ?? (portrait && isHorizontal ? "blur" : (s.fit ?? "cover"));
  const panX = s.panX ?? 0;
  const panY = s.panY ?? 0;
  const baseScale = s.scale ?? 1.0;
  const blurRadius = s.blurRadius ?? 25;
  const blurBrightness = s.blurBrightness ?? 0.55;
  const punchPattern = s.punchInPattern ?? "none";
  const punchZoom = s.punchInZoom ?? 1.2;

  // --- Split Screen 50/50 (Fase B) ---
  const isSplit = !!s.splitScreen?.enabled;
  const splitRatio = s.splitScreen?.splitRatio ?? 0.5;
  const isReverse = !!s.splitScreen?.reverse;
  const primaryRatio = isReverse ? 1 - splitRatio : splitRatio;
  const secondaryRatio = 1 - primaryRatio;

  const secondaryAsset = s.splitScreen?.assetId ? assets?.find((a) => a.id === s.splitScreen?.assetId) : undefined;
  const secondarySrc = secondaryAsset
    ? `${mediaBase}/media/${secondaryAsset.file}`
    : s.splitScreen?.file
      ? `${mediaBase}/media/${s.splitScreen.file}`
      : src;
  const secondaryPanX = s.splitScreen?.secondaryPanX ?? 0;
  const secondaryPanY = s.splitScreen?.secondaryPanY ?? 0;
  const secondaryScale = s.splitScreen?.secondaryScale ?? 1.0;
  const secondaryVolume = s.splitScreen?.secondaryVolume ?? 0;
  const showDivider = s.splitScreen?.divider !== false;
  const dividerColor = s.splitScreen?.dividerColor || (theme?.accent ?? "#ffd84d");
  const dividerWidth = s.splitScreen?.dividerWidth ?? 3;

  let from = 0;
  const primaryContent = (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {s.segments.map((seg, i) => {
        const len = segFrames(seg);
        const startAt = from;
        from += len;
        const vol = s.volume;
        const isPunchIn =
          punchPattern === "alternate"
            ? (seg.punchIn !== undefined ? seg.punchIn : i % 2 === 1)
            : punchPattern === "manual"
              ? !!seg.punchIn
              : !!seg.punchIn;
        const effectiveScale = isPunchIn ? baseScale * punchZoom : baseScale;
        return (
          <Sequence key={`${i}-${seg.start}`} from={startAt} durationInFrames={len} premountFor={FPS} name={`trecho ${i + 1}`}>
            {/* Camada de fundo desfocado (quando bgMode === 'blur') */}
            {effectiveBgMode === "blur" ? (
              <OffthreadVideo
                src={src}
                trimBefore={Math.round(seg.start * FPS)}
                volume={() => 0}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scale(1.35)",
                  filter: `blur(${blurRadius}px) brightness(${blurBrightness})`,
                  pointerEvents: "none",
                  visibility: failed ? "hidden" : undefined,
                }}
                pauseWhenBuffering
              />
            ) : null}

            {/* Vídeo principal com ajuste de enquadramento (pan / zoom / punch-in) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `translate(${panX}%, ${panY}%) scale(${effectiveScale})`,
                transformOrigin: "center center",
              }}
            >
              <OffthreadVideo
                src={src}
                trimBefore={Math.round(seg.start * FPS)}
                volume={(f) => (len > 8 ? vol * interpolate(f, [0, 3, len - 3, len], [0, 1, 1, 0], clamp) : vol)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: effectiveBgMode === "cover" ? "cover" : "contain",
                  visibility: failed ? "hidden" : undefined,
                }}
                onError={onError}
                pauseWhenBuffering
              />
            </div>
          </Sequence>
        );
      })}
    </div>
  );

  const secondaryContent = (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#0c0d14" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `translate(${secondaryPanX}%, ${secondaryPanY}%) scale(${secondaryScale})`,
          transformOrigin: "center center",
        }}
      >
        <OffthreadVideo
          src={secondarySrc}
          volume={secondaryVolume}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          pauseWhenBuffering
        />
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: s.bgMode === "black" ? "#000" : (theme?.bg ?? "#000") }}>
      {failed ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "#14161f", color: "#c9cddb", fontFamily: FONT, fontSize: 28, textAlign: "center", padding: 60 }}>
          Este navegador não conseguiu tocar o vídeo na prévia. Use Chrome ou Edge atualizados; a exportação não é afetada.
        </AbsoluteFill>
      ) : null}

      {isSplit ? (
        <>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: isReverse ? `${(1 - primaryRatio) * 100}%` : 0,
              height: `${primaryRatio * 100}%`,
              overflow: "hidden",
              zIndex: 1,
            }}
          >
            {primaryContent}
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: isReverse ? 0 : `${primaryRatio * 100}%`,
              height: `${secondaryRatio * 100}%`,
              overflow: "hidden",
              zIndex: 1,
            }}
          >
            {secondaryContent}
          </div>

          {showDivider ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${(isReverse ? 1 - primaryRatio : primaryRatio) * 100}%`,
                height: dividerWidth,
                background: dividerColor,
                transform: "translateY(-50%)",
                zIndex: 10,
                boxShadow: `0 0 14px ${alpha(dividerColor, 0.6)}`,
              }}
            />
          ) : null}
        </>
      ) : (
        primaryContent
      )}
    </AbsoluteFill>
  );
};

const MediaBase = createContext("");

const SceneView: React.FC<{ scene: Scene; theme: Theme; assets?: ImageAsset[] }> = ({ scene, theme, assets }) => {
  const mediaBase = useContext(MediaBase);
  switch (scene.type) {
    case "video":
      return <VideoView s={scene} mediaBase={mediaBase} theme={theme} assets={assets} />;
    case "title":
      return <TitleView s={scene} t={theme} />;
    case "chart":
      return <ChartView s={scene} t={theme} />;
    case "stats":
      return <StatsView s={scene} t={theme} />;
    case "text":
      return <TextView s={scene} t={theme} />;
    case "outro":
      return <OutroView s={scene} t={theme} />;
  }
};

// Garante que a Inter carregou antes de capturar os quadros
const useFonts = () => {
  const [handle] = useState(() => delayRender("Carregando fontes"));
  useEffect(() => {
    Promise.all(
      [400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 64px Inter`)),
    )
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle]);
};

const SceneBackground: React.FC<{ theme: Theme }> = ({ theme }) => (
  <AbsoluteFill style={{ background: `radial-gradient(70% 60% at 30% 38%, ${theme.glow}, ${theme.bg} 75%)` }} />
);

const ProgressBarLayer: React.FC<{ project: Project }> = ({ project }) => {
  const frame = useCurrentFrame();
  const pb = project.progressBar;
  if (!pb || !pb.enabled) return null;
  const total = totalFrames(project);
  const progress = Math.min(1, Math.max(0, (frame + 1) / total));
  const height = pb.height ?? 6;
  const isTop = pb.position === "top";
  const color = pb.color || project.theme.accent;
  const bg = pb.background || "rgba(255, 255, 255, 0.2)";

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: isTop ? 0 : undefined,
        bottom: isTop ? undefined : 0,
        height,
        background: bg,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: "100%",
          background: color,
        }}
      />
    </div>
  );
};

export const Video: React.FC<Project> = (raw) => {
  useFonts();
  const project = normalizeProject(raw);
  const { theme, scenes } = project;
  const { width, height } = useVideoConfig();
  const mediaBase = project.mediaBase ?? "";
  return (
    <MediaBase.Provider value={mediaBase}>
    <AbsoluteFill style={{ background: theme.bg, color: theme.ink, fontFamily: FONT }}>
      <EffectsLayer effects={project.effects ?? []} duration={totalFrames(project)}>
        <TransitionSeries>
          {scenes.flatMap((scene, i) => {
            const t = transitionFrames(scenes, i);
            const items = [
              <TransitionSeries.Sequence key={scene.id} durationInFrames={scene.duration} name={scene.type}>
                <ExitContext.Provider value={t === 0}>
                  <EffectsLayer
                    effects={scene.effects ?? []}
                    duration={scene.duration}
                    background={<SceneBackground theme={theme} />}
                  >
                    <SceneView scene={scene} theme={theme} assets={project.assets} />
                  </EffectsLayer>
                </ExitContext.Provider>
              </TransitionSeries.Sequence>,
            ];
            if (t > 0 && scene.transition) {
              items.push(
                <TransitionSeries.Transition
                  key={`${scene.id}-t`}
                  presentation={makePresentation(scene.transition, width, height)}
                  timing={linearTiming({ durationInFrames: t, easing: Easing.bezier(0.65, 0, 0.35, 1) })}
                />,
              );
            }
            return items;
          })}
        </TransitionSeries>
        <OverlaysLayer project={project} mediaBase={mediaBase} />
        <HeadlineLayer project={project} />
        <CaptionsLayer project={project} />
        <ProgressBarLayer project={project} />
        <AudioLayer project={project} mediaBase={mediaBase} />
      </EffectsLayer>
    </AbsoluteFill>
    </MediaBase.Provider>
  );
};
