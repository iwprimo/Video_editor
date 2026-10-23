// Armazenamento: mostra quanto a mídia ocupa e deixa apagar o que o projeto aberto não usa
import React, { useMemo, useState } from "react";
import type { Project } from "../remotion/types";
import { postJson } from "./api";

type Kind = "used" | "duplicate" | "leftover" | "unused";
type MediaFile = { folder: "midia" | "originais"; name: string; size: number; mtimeMs: number; used: boolean; kind: Kind };
type Scan = { files: MediaFile[]; totals: Record<"all" | "used" | "duplicate" | "leftover" | "unused", number> };

const gb = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1).replace(".", ",")} GB` : `${Math.max(0.1, n / 1e6).toFixed(1).replace(".", ",")} MB`);
const keyOf = (f: MediaFile) => `${f.folder}/${f.name}`;

const GROUPS: { kind: Exclude<Kind, "used">; title: string; hint: string; preselect: boolean }[] = [
  {
    kind: "duplicate",
    title: "Cópias repetidas",
    hint: "O mesmo vídeo importado mais de uma vez. O projeto usa outra cópia idêntica.",
    preselect: true,
  },
  {
    kind: "leftover",
    title: "Sobras de importação",
    hint: "Cópias do arquivo enviado que ficavam guardadas depois da importação. O editor não usa.",
    preselect: true,
  },
  {
    kind: "unused",
    title: "Não usados neste projeto",
    hint: "Podem pertencer a outro projeto salvo em .json. Apague só o que você reconhece.",
    preselect: false,
  },
];

export const MediaCleanup: React.FC<{ project: Project }> = ({ project }) => {
  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await postJson<Scan>("/api/media/scan", { project });
      setScan(r);
      setSel(new Set(r.files.filter((f) => GROUPS.find((g) => g.kind === f.kind)?.preselect).map(keyOf)));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const chosen = useMemo(() => (scan ? scan.files.filter((f) => f.kind !== "used" && sel.has(keyOf(f))) : []), [scan, sel]);
  const chosenSize = chosen.reduce((a, f) => a + f.size, 0);

  const toggle = (f: MediaFile) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(keyOf(f))) n.delete(keyOf(f));
      else n.add(keyOf(f));
      return n;
    });

  const remove = async () => {
    if (!chosen.length) return;
    if (!confirm(`Apagar ${chosen.length} arquivo(s) e liberar ${gb(chosenSize)}? Não dá para desfazer.`)) return;
    setBusy(true);
    try {
      const r = await postJson<{ removed: unknown[]; freed: number; errors: string[] }>("/api/media/delete", {
        files: chosen.map((f) => ({ folder: f.folder, name: f.name })),
      });
      setMsg({
        ok: !r.errors.length,
        text: `${r.removed.length} arquivo(s) apagado(s), ${gb(r.freed)} liberados.${r.errors.length ? ` Não apagados: ${r.errors.join("; ")}` : ""}`,
      });
      const fresh = await postJson<Scan>("/api/media/scan", { project });
      setScan(fresh);
      setSel(new Set());
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="media-clean">
      {!scan ? (
        <>
          <span className="field-hint">Veja quanto espaço a mídia ocupa e apague cópias repetidas ou arquivos que este projeto não usa.</span>
          <button type="button" className="btn wide" onClick={run} disabled={busy}>
            {busy ? "Verificando…" : "Verificar mídia"}
          </button>
        </>
      ) : (
        <>
          <div className="mc-summary">
            <span>
              <b>{gb(scan.totals.all)}</b> no total
            </span>
            <span>{gb(scan.totals.used)} em uso por este projeto</span>
            <button type="button" className="link" onClick={run} disabled={busy}>
              Verificar de novo
            </button>
          </div>
          {GROUPS.map((g) => {
            const items = scan.files.filter((f) => f.kind === g.kind);
            if (!items.length) return null;
            return (
              <div key={g.kind} className="mc-group">
                <div className="mc-head">
                  <span className="mc-title">{g.title}</span>
                  <span className="mc-size">{gb(scan.totals[g.kind])}</span>
                </div>
                <span className="field-hint">{g.hint}</span>
                <ul className="mc-list">
                  {items.map((f) => (
                    <li key={keyOf(f)}>
                      <label className="mc-item">
                        <input type="checkbox" checked={sel.has(keyOf(f))} onChange={() => toggle(f)} />
                        <span className="mc-name" title={`${f.folder}/${f.name}`}>
                          {f.name}
                          {f.folder === "originais" ? <em> · originais</em> : null}
                        </span>
                        <span className="mc-fsize">{gb(f.size)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {!scan.files.some((f) => f.kind !== "used") ? <span className="field-hint">Nada para limpar: toda a mídia é usada por este projeto.</span> : null}
          {scan.files.some((f) => f.kind !== "used") ? (
            <button type="button" className="btn danger-solid wide" onClick={remove} disabled={busy || !chosen.length}>
              {busy ? "Apagando…" : chosen.length ? `Apagar ${chosen.length} arquivo(s) · liberar ${gb(chosenSize)}` : "Marque o que apagar"}
            </button>
          ) : null}
        </>
      )}
      {msg ? (
        <span className={msg.ok ? "form-ok-inline" : "form-error-inline"} role="status">
          {msg.text}
        </span>
      ) : null}
    </div>
  );
};
