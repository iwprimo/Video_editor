import React, { useEffect, useRef, useState } from "react";

export type PromptEntry = { message: string; reply: string; notes?: string[]; error?: boolean };

type Props = {
  busy: boolean;
  status: string | null;
  history: PromptEntry[];
  hasKey: boolean;
  hasVideo: boolean;
  canUndo: boolean;
  onSubmit: (message: string) => void;
  onUndo: () => void;
  onOpenSettings: () => void;
};

const SUGGESTIONS_VIDEO = [
  "Remova os silêncios e as pausas longas",
  "Ative legendas amarelas em caixa alta",
  "Coloque meu nome e cargo no começo",
  "Insira ícones nos assuntos principais",
  "Mostre os números que eu falo com contadores",
];
const SUGGESTIONS = [
  "Crie uma abertura com o título do vídeo",
  "Troque o tema para Floresta",
  "Adicione uma transição de dissolver entre as cenas",
];

export const PromptBar: React.FC<Props> = ({ busy, status, history, hasKey, hasVideo, canUndo, onSubmit, onUndo, onOpenSettings }) => {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [showLast, setShowLast] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const last = history[history.length - 1];

  useEffect(() => {
    if (last) setShowLast(true);
    const t = setTimeout(() => setShowLast(false), 12000);
    return () => clearTimeout(t);
  }, [last]);

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, history.length]);

  const send = (msg = text) => {
    const m = msg.trim();
    if (!m || busy) return;
    onSubmit(m);
    setText("");
  };

  return (
    <div className="prompt-wrap">
      {open ? (
        <div className="prompt-log" ref={logRef} aria-label="Histórico de pedidos">
          {!history.length ? <p className="empty">Os pedidos e respostas aparecem aqui.</p> : null}
          {history.map((h, i) => (
            <div key={i} className="log-item">
              <div className="log-q">{h.message}</div>
              <div className={h.error ? "log-a err" : "log-a"}>{h.reply}</div>
              {h.notes?.length ? <div className="log-notes">{h.notes.join(" · ")}</div> : null}
            </div>
          ))}
        </div>
      ) : showLast && last && !busy ? (
        <div className={last.error ? "prompt-reply err" : "prompt-reply"} role="status">
          <span>{last.reply}</span>
          {!last.error && canUndo ? (
            <button className="link" onClick={onUndo}>
              Desfazer
            </button>
          ) : null}
          <button className="link" onClick={() => setShowLast(false)} aria-label="Fechar">
            ×
          </button>
        </div>
      ) : null}

      {!text && !busy && !open && !history.length && hasKey ? (
        <div className="suggestions">
          {(hasVideo ? SUGGESTIONS_VIDEO : SUGGESTIONS).map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className={busy ? "prompt-bar busy" : "prompt-bar"}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <svg className="spark" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" />
          <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
        </svg>
        {hasKey ? (
          <input
            className="prompt-input"
            placeholder={busy ? status ?? "Editando…" : "Peça uma edição: “corte a parte em que falo do almoço”"}
            value={busy ? "" : text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label="Pedido de edição"
          />
        ) : (
          <button type="button" className="prompt-setup" onClick={onOpenSettings}>
            Configure a chave da API da Claude para editar por prompt
          </button>
        )}
        <button type="button" className="btn ghost sm-text" onClick={() => setOpen((v) => !v)} aria-expanded={open} title="Histórico">
          {open ? "Fechar" : "Histórico"}
        </button>
        <button type="submit" className="btn primary" disabled={!hasKey || busy || !text.trim()}>
          {busy ? <span className="spinner" aria-label="Editando" /> : "Enviar"}
        </button>
      </form>
    </div>
  );
};
