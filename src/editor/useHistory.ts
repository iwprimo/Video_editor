import { useCallback, useRef, useState } from "react";

// Histórico simples com desfazer/refazer.
// Edições seguidas com a mesma "mergeKey" (ex.: digitar num campo) viram um único passo.
type State<T> = { past: T[]; present: T; future: T[] };

const LIMIT = 100;
const MERGE_WINDOW_MS = 900;

export function useHistory<T>(initial: () => T) {
  const [state, setState] = useState<State<T>>(() => ({ past: [], present: initial(), future: [] }));
  const last = useRef<{ key?: string; at: number }>({ at: 0 });

  const set = useCallback((next: T | ((prev: T) => T), mergeKey?: string) => {
    setState((s) => {
      const value = typeof next === "function" ? (next as (p: T) => T)(s.present) : next;
      if (value === s.present) return s;
      const now = Date.now();
      const merge = mergeKey !== undefined && last.current.key === mergeKey && now - last.current.at < MERGE_WINDOW_MS;
      last.current = { key: mergeKey, at: now };
      if (merge) return { ...s, present: value, future: [] };
      return { past: [...s.past, s.present].slice(-LIMIT), present: value, future: [] };
    });
  }, []);

  // Alteração temporária (ex.: arrastar) sem registrar no histórico
  const preview = useCallback((value: T) => setState((s) => ({ ...s, present: value })), []);

  // Registra o estado atual como um passo, usando "base" como ponto anterior
  const commitFrom = useCallback((base: T) => {
    last.current = { at: 0 };
    setState((s) => (s.present === base ? s : { past: [...s.past, base].slice(-LIMIT), present: s.present, future: [] }));
  }, []);

  const undo = useCallback(() => {
    last.current = { at: 0 };
    setState((s) => {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    last.current = { at: 0 };
    setState((s) => {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      return { past: [...s.past, s.present], present: next, future: rest };
    });
  }, []);

  const reset = useCallback((value: T) => {
    last.current = { at: 0 };
    setState({ past: [], present: value, future: [] });
  }, []);

  return {
    value: state.present,
    set,
    preview,
    commitFrom,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
