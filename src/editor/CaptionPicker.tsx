// Seletor de estilo de legenda com prévia de cada estilo (anima ao passar o mouse)
import React, { useEffect, useRef, useState } from "react";
import { CAPTION_PRESETS, CAPTION_STYLES, CaptionSettings, CaptionStyle } from "../remotion/types";
import { CapWord, CaptionPage } from "../remotion/captions";

const SAMPLE: CapWord[] = [
  { text: "Faça", startMs: 0, endMs: 380 },
  { text: "isso", startMs: 420, endMs: 800 },
  { text: "hoje", startMs: 840, endMs: 1300 },
];
const LOOP = 2200;
const STILL = 560; // instante mostrado quando parado: segunda palavra falando

type Props = {
  cfg: CaptionSettings;
  onPick: (style: CaptionStyle) => void;
};

export const CaptionPicker: React.FC<Props> = ({ cfg, onPick }) => {
  const [hover, setHover] = useState<CaptionStyle | null>(null);
  const [t, setT] = useState(STILL);
  const raf = useRef(0);

  useEffect(() => {
    if (!hover) {
      setT(STILL);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      setT((now - t0) % LOOP);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [hover]);

  const styles = Object.keys(CAPTION_STYLES) as CaptionStyle[];
  return (
    <div className="cap-picker" role="radiogroup" aria-label="Estilo da legenda">
      {styles.map((k) => {
        const on = cfg.style === k;
        const time = hover === k ? t : STILL;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            className={`cap-card${on ? " on" : ""}`}
            onClick={() => onPick(k)}
            onMouseEnter={() => setHover(k)}
            onMouseLeave={() => setHover((h) => (h === k ? null : h))}
            onFocus={() => setHover(k)}
            onBlur={() => setHover((h) => (h === k ? null : h))}
            title={CAPTION_PRESETS[k].hint}
            aria-label={CAPTION_STYLES[k]}
          >
            <span className="cap-preview" aria-hidden>
              <CaptionPage
                words={SAMPLE}
                t={time}
                pageStart={0}
                cfg={{ ...cfg, style: k, size: 1, uppercase: cfg.uppercase }}
                u={k === "impact" || k === "duo" || k === "hormozi" || k === "mrbeast" ? 0.18 : 0.24}
              />
            </span>
            <span className="cap-name">{CAPTION_STYLES[k].replace(/\s*\(.*\)$/, "")}</span>
          </button>
        );
      })}
    </div>
  );
};

// Escolher um estilo também aplica o número de palavras e a caixa alta que combinam com ele
export const pickStyle = (c: CaptionSettings, style: CaptionStyle): CaptionSettings => {
  const p = CAPTION_PRESETS[style];
  return { ...c, style, wordsPerPage: p.wordsPerPage, uppercase: p.uppercase ?? (CAPTION_PRESETS[c.style]?.uppercase ? false : c.uppercase) };
};
