// Editor da transcrição: palavras clicáveis (cortar, corrigir, navegar pelo teclado),
// modo texto (editar tudo como um texto comum), localizar e substituir e correção por IA.
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Word } from "../remotion/types";
import { ApiError, pollJob, postJson } from "./api";
import { Change, applyChanges, countMatches, diffText, editWord, replaceAll, wordsToText } from "./transcript";

type Props = {
  words: Word[];
  isCut: boolean[];
  sourceTime: number | null;
  glossary: string;
  aiReady: boolean;
  onWords: (words: Word[]) => void;
  onGlossary: (g: string) => void;
  onCut: (a: number, b: number) => void;
  onRestore: (a: number, b: number) => void;
  onSeek: (t: number) => void;
  onTranscribe: () => void;
  onOpenSettings: () => void;
  flash: (msg: string) => void;
};

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
};

const PAUSE = 1.2; // segundos de pausa que viram parágrafo

type Review = { changes: Change[]; accepted: boolean[] };

export const TranscriptEditor: React.FC<Props> = ({
  words,
  isCut,
  sourceTime,
  glossary,
  aiReady,
  onWords,
  onGlossary,
  onCut,
  onRestore,
  onSeek,
  onTranscribe,
  onOpenSettings,
  flash,
}) => {
  const [mode, setMode] = useState<"words" | "text">("words");
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [text, setText] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [find, setFind] = useState("");
  const [repl, setRepl] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiJob, setAiJob] = useState<{ stage: string; progress: number } | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);
  const saving = useRef(false);

  const selRange = sel ? ([Math.min(sel[0], sel[1]), Math.max(sel[0], sel[1])] as const) : null;
  const selCut = selRange ? isCut.slice(selRange[0], selRange[1] + 1) : [];
  const selAllCut = selCut.length > 0 && selCut.every(Boolean);

  // Palavra que está tocando
  const playingIdx = useMemo(() => {
    if (sourceTime === null) return -1;
    return words.findIndex((w) => sourceTime >= w.start && sourceTime < w.end + 0.05);
  }, [words, sourceTime]);

  // Rola a lista para acompanhar a palavra em reprodução
  useEffect(() => {
    if (playingIdx < 0 || mode !== "words" || editing !== null) return;
    const box = boxRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-i="${playingIdx}"]`);
    if (!box || !el) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 8 || top > box.scrollTop + box.clientHeight - 40) box.scrollTo({ top: top - box.clientHeight / 3, behavior: "smooth" });
  }, [playingIdx, mode, editing]);

  // Solta o arraste de seleção em qualquer lugar da tela
  useEffect(() => {
    const up = () => (dragging.current = null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const textChanges = useMemo(() => (mode === "text" ? diffText(words, text) : []), [mode, words, text]);

  const startEdit = (i: number) => {
    setEditing(i);
    setDraft(words[i].text);
  };

  // Salva a palavra editada; "next" passa para a vizinha (Tab / Shift+Tab)
  const saveWord = (next = 0) => {
    if (editing === null || saving.current) return;
    saving.current = true;
    requestAnimationFrame(() => (saving.current = false));
    const i = editing;
    const value = draft.trim();
    const before = words.length;
    if (value !== words[i].text) onWords(editWord(words, i, value));
    const grew = (value ? value.split(/\s+/).length : 0) - 1;
    setEditing(null);
    if (next) {
      const target = next > 0 ? i + 1 + Math.max(-1, grew) : i - 1;
      const len = before + grew;
      if (target >= 0 && target < len) {
        // Espera a lista nova antes de abrir a próxima
        requestAnimationFrame(() => {
          setEditing(target);
          setSel([target, target]);
        });
      }
    }
    requestAnimationFrame(() => boxRef.current?.focus());
  };

  // Abre a próxima edição com o texto atual da palavra
  useEffect(() => {
    if (editing !== null && words[editing]) setDraft(words[editing].text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const select = (i: number, extend: boolean) => {
    if (extend && sel) setSel([sel[0], i]);
    else {
      setSel([i, i]);
      onSeek(words[i].start + 0.01);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing !== null) return;
    const last = words.length - 1;
    const cur = sel ? sel[1] : -1;
    const k = e.key;
    let handled = true;
    if (k === "ArrowRight" || k === "ArrowLeft") {
      const step = k === "ArrowRight" ? 1 : -1;
      const n = Math.max(0, Math.min(last, cur < 0 ? 0 : cur + step));
      if (e.shiftKey && sel) setSel([sel[0], n]);
      else select(n, false);
      boxRef.current?.querySelector(`[data-i="${n}"]`)?.scrollIntoView({ block: "nearest" });
    } else if ((k === "Enter" || k === "F2") && selRange) {
      startEdit(selRange[0]);
    } else if ((k === "Delete" || k === "Backspace") && selRange) {
      if (selAllCut) onRestore(selRange[0], selRange[1]);
      else onCut(selRange[0], selRange[1]);
    } else if (k === "Escape") {
      setSel(null);
    } else if (k.toLowerCase() === "a" && (e.ctrlKey || e.metaKey)) {
      setSel([0, last]);
    } else handled = false;
    if (handled) {
      e.preventDefault();
      // Não deixa os atalhos do editor (apagar cena, mover o cursor) agirem aqui
      e.stopPropagation();
    }
  };

  // ---------- Modo texto ----------
  const openText = () => {
    setText(wordsToText(words, PAUSE));
    setMode("text");
    setSel(null);
    setEditing(null);
  };
  const applyText = () => {
    if (textChanges.length) {
      onWords(applyChanges(words, textChanges));
      flash(`${textChanges.length} alteração(ões) aplicada(s) na transcrição`);
    }
    setMode("words");
  };

  // ---------- Localizar e substituir ----------
  const matches = useMemo(() => (findOpen ? countMatches(words, find) : 0), [findOpen, words, find]);
  const doReplace = () => {
    const ch = replaceAll(words, find, repl);
    if (!ch.length) return flash("Nada para substituir");
    onWords(applyChanges(words, ch));
    flash(`${matches} ocorrência(s) substituída(s)`);
  };

  // ---------- Correção por IA ----------
  const runAi = async () => {
    setAiJob({ stage: "Enviando para o Claude", progress: 0 });
    setReview(null);
    try {
      const { jobId } = await postJson<{ jobId: string }>("/api/transcript/fix", { words, glossary });
      const res = await pollJob<{ chunks: { from: number; to: number; text: string }[] }>(jobId, (j) => setAiJob({ stage: j.stage, progress: j.progress }), 800);
      const changes = res.chunks.flatMap((c) => (c.text.trim() ? diffText(words.slice(c.from, c.to), c.text, c.from) : []));
      if (!changes.length) flash("A IA não encontrou nada para corrigir");
      else setReview({ changes, accepted: changes.map(() => true) });
    } catch (e) {
      flash(e instanceof ApiError || e instanceof Error ? e.message : String(e));
    } finally {
      setAiJob(null);
    }
  };
  const applyReview = () => {
    if (!review) return;
    const chosen = review.changes.filter((_, i) => review.accepted[i]);
    if (chosen.length) {
      onWords(applyChanges(words, chosen));
      flash(`${chosen.length} correção(ões) aplicada(s). Use Desfazer se quiser voltar.`);
    }
    setReview(null);
  };
  const acceptedCount = review ? review.accepted.filter(Boolean).length : 0;

  // Palavras marcadas pela revisão em andamento
  const pending = useMemo(() => {
    const m = new Map<number, number>();
    review?.changes.forEach((c, k) => {
      for (let i = c.from; i < Math.max(c.to, c.from + 1); i++) m.set(i, k);
    });
    return m;
  }, [review]);

  return (
    <div className="tx">
      <div className="tx-head">
        <div className="segmented flush small" role="radiogroup" aria-label="Modo de edição">
          <button type="button" role="radio" aria-checked={mode === "words"} className={`seg${mode === "words" ? " on" : ""}`} onClick={() => setMode("words")}>
            Palavras
          </button>
          <button type="button" role="radio" aria-checked={mode === "text"} className={`seg${mode === "text" ? " on" : ""}`} onClick={() => (mode === "text" ? null : openText())}>
            Texto
          </button>
        </div>
        <span className="grow" />
        <button
          type="button"
          className={`btn ghost sm-text icon-only${findOpen ? " on" : ""}`}
          onClick={() => setFindOpen((v) => !v)}
          aria-pressed={findOpen}
          aria-label="Localizar e substituir"
          title="Localizar e substituir"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M7 2.5a4.5 4.5 0 1 0 2.67 8.13l2.85 2.85a.75.75 0 1 0 1.06-1.06l-2.85-2.85A4.5 4.5 0 0 0 7 2.5Zm-3 4.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
          </svg>
        </button>
        <button type="button" className={`btn ghost sm-text${aiOpen ? " on" : ""}`} onClick={() => setAiOpen((v) => !v)} aria-pressed={aiOpen}>
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
            <path d="M8 1.5l1.4 3.6 3.6 1.4-3.6 1.4L8 11.5 6.6 7.9 3 6.5l3.6-1.4L8 1.5zM12.5 10l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
          </svg>
          Corrigir com IA
        </button>
      </div>

      {findOpen ? (
        <div className="tx-panel">
          <div className="grid-2">
            <input className="input" placeholder="Localizar" value={find} onChange={(e) => setFind(e.target.value)} autoFocus />
            <input className="input" placeholder="Substituir por" value={repl} onChange={(e) => setRepl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doReplace()} />
          </div>
          <div className="row-actions">
            <span className="muted small">{find.trim() ? `${matches} ocorrência(s)` : "Palavra ou trecho, sem diferenciar maiúsculas"}</span>
            <span className="grow" />
            <button type="button" className="btn sm-text" disabled={!matches} onClick={doReplace}>
              Substituir tudo
            </button>
          </div>
        </div>
      ) : null}

      {aiOpen ? (
        <div className="tx-panel">
          {!review ? (
            <>
              <label className="field">
                <span className="field-label">Termos e nomes (opcional)</span>
                <textarea
                  className="input area"
                  rows={2}
                  placeholder="Ex.: aldosterona, Dr. Vinícius, Klabin, MP9"
                  value={glossary}
                  onChange={(e) => onGlossary(e.target.value)}
                />
                <span className="field-hint">
                  O Claude corrige palavras mal reconhecidas, acentos, pontuação e nomes, sem mudar o que foi dito. Você revisa antes de aplicar, e os tempos das
                  palavras são mantidos.
                </span>
              </label>
              {aiJob ? (
                <div className="job">
                  <span>{aiJob.stage}</span>
                  <span className="bar">
                    <span style={{ transform: `scaleX(${Math.max(0.04, aiJob.progress)})` }} />
                  </span>
                </div>
              ) : aiReady ? (
                <button type="button" className="btn primary wide" onClick={runAi}>
                  Corrigir transcrição
                </button>
              ) : (
                <button type="button" className="btn wide" onClick={onOpenSettings}>
                  Configurar o acesso ao Claude
                </button>
              )}
            </>
          ) : (
            <>
              <div className="row-actions">
                <strong className="small">{review.changes.length} correção(ões) sugerida(s)</strong>
                <span className="grow" />
                <button
                  type="button"
                  className="link"
                  onClick={() => setReview({ ...review, accepted: review.accepted.map(() => acceptedCount < review.changes.length) })}
                >
                  {acceptedCount < review.changes.length ? "Marcar todas" : "Desmarcar todas"}
                </button>
              </div>
              <ul className="fix-list">
                {review.changes.map((c, k) => {
                  const before = words.slice(c.from, c.to).map((w) => w.text).join(" ");
                  return (
                    <li key={k}>
                      <label className={`fix${review.accepted[k] ? "" : " off"}`}>
                        <input
                          type="checkbox"
                          checked={review.accepted[k]}
                          onChange={(e) => setReview({ ...review, accepted: review.accepted.map((v, i) => (i === k ? e.target.checked : v)) })}
                        />
                        <span className="fix-text">
                          <del>{before || "—"}</del>
                          <span aria-hidden>→</span>
                          <ins>{c.tokens.join(" ") || "(remover)"}</ins>
                        </span>
                        {words[c.from] ? (
                          <button
                            type="button"
                            className="link fix-time"
                            onClick={(e) => {
                              e.preventDefault();
                              onSeek(words[c.from].start + 0.01);
                            }}
                          >
                            {fmt(words[c.from].start)}
                          </button>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="row-actions">
                <button type="button" className="btn primary" disabled={!acceptedCount} onClick={applyReview}>
                  Aplicar {acceptedCount}
                </button>
                <button type="button" className="btn ghost" onClick={() => setReview(null)}>
                  Descartar
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {mode === "text" ? (
        <>
          <textarea
            className="transcript-text"
            value={text}
            spellCheck
            lang="pt-BR"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                applyText();
              }
              if (e.key === "Escape") setMode("words");
            }}
            aria-label="Transcrição como texto"
          />
          <div className="row-actions">
            <span className="muted small">
              {textChanges.length ? `${textChanges.length} alteração(ões)` : "Edite como um texto comum. Os tempos das palavras são mantidos."}
            </span>
            <span className="grow" />
            <button type="button" className="btn ghost" onClick={() => setMode("words")}>
              Cancelar
            </button>
            <button type="button" className="btn primary" disabled={!textChanges.length} onClick={applyText}>
              Aplicar
            </button>
          </div>
          <p className="field-hint">Apagar palavras aqui só tira da legenda. Para tirar do vídeo, use Cortar trecho no modo Palavras.</p>
        </>
      ) : (
        <>
          <div
            ref={boxRef}
            className="transcript"
            role="listbox"
            aria-multiselectable
            aria-label="Transcrição"
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            {words.map((w, i) => {
              const inSel = selRange && i >= selRange[0] && i <= selRange[1];
              const br = i > 0 && w.start - words[i - 1].end > PAUSE;
              const fix = pending.get(i);
              const node =
                editing === i ? (
                  <input
                    key={i}
                    className="word-edit"
                    autoFocus
                    value={draft}
                    size={Math.max(4, draft.length + 1)}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => saveWord()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") saveWord();
                      else if (e.key === "Tab") {
                        e.preventDefault();
                        saveWord(e.shiftKey ? -1 : 1);
                      } else if (e.key === "Escape") {
                        setEditing(null);
                        boxRef.current?.focus();
                      }
                    }}
                    aria-label="Corrigir palavra"
                  />
                ) : (
                  <span
                    key={i}
                    data-i={i}
                    role="option"
                    aria-selected={!!inSel}
                    className={`word${isCut[i] ? " cut" : ""}${inSel ? " sel" : ""}${i === playingIdx ? " now" : ""}${fix !== undefined && review?.accepted[fix] ? " fixme" : ""}`}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      select(i, e.shiftKey);
                      if (!e.shiftKey) dragging.current = i;
                    }}
                    onPointerEnter={() => {
                      if (dragging.current !== null) setSel([dragging.current, i]);
                    }}
                    onDoubleClick={() => startEdit(i)}
                    title={`${fmt(w.start)} · duplo clique para corrigir`}
                  >
                    {w.text}
                  </span>
                );
              // O espaço entre as palavras é o que permite a quebra de linha
              return (
                <React.Fragment key={i}>
                  {br ? <span className="para" aria-hidden /> : null}
                  {node}{" "}
                </React.Fragment>
              );
            })}
          </div>
          {selRange ? (
            <div className="row-actions sticky-actions">
              <span className="muted small">
                {selRange[1] - selRange[0] + 1} palavra(s) · {fmt(words[selRange[0]].start)}
              </span>
              <span className="grow" />
              <button type="button" className="btn ghost sm-text" onClick={() => startEdit(selRange[0])} title="Enter ou F2">
                Corrigir
              </button>
              {selAllCut ? (
                <button type="button" className="btn sm-text" onClick={() => onRestore(selRange[0], selRange[1])}>
                  Restaurar trecho
                </button>
              ) : (
                <button type="button" className="btn primary sm-text" onClick={() => onCut(selRange[0], selRange[1])} title="Delete">
                  Cortar trecho
                </button>
              )}
              <button type="button" className="btn ghost sm-text icon-x" onClick={() => setSel(null)} aria-label="Limpar seleção" title="Esc">
                ×
              </button>
            </div>
          ) : (
            <p className="field-hint">
              Clique para ir até a palavra · arraste ou Shift+clique para selecionar · duplo clique (ou Enter) para corrigir · Tab passa para a próxima · Delete
              corta o trecho.
            </p>
          )}
        </>
      )}

      <button type="button" className="link" onClick={onTranscribe}>
        Transcrever de novo
      </button>
    </div>
  );
};
