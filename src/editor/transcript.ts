// Edição de transcrição por texto, preservando o tempo de cada palavra.
// O texto novo é alinhado ao antigo (maior subsequência comum); palavras iguais mantêm o tempo,
// palavras trocadas herdam o tempo das que substituíram e palavras novas ocupam o espaço entre vizinhas.
import type { Word } from "../remotion/types";

// Troca no texto: palavras antigas [from, to) viram `tokens`
export type Change = { from: number; to: number; tokens: string[] };

export const tokenize = (text: string) => text.split(/\s+/).filter(Boolean);

// Forma comparável: sem acento, pontuação ou caixa
export const norm = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

// Pares (i antigo, j novo) que casam, em ordem
const matchPairs = (a: string[], b: string[]): [number, number][] => {
  const na = a.map(norm);
  const nb = b.map(norm);
  // Começo e fim iguais saem antes (a maioria das edições é local)
  let pre = 0;
  while (pre < na.length && pre < nb.length && na[pre] === nb[pre]) pre++;
  let suf = 0;
  while (suf < na.length - pre && suf < nb.length - pre && na[na.length - 1 - suf] === nb[nb.length - 1 - suf]) suf++;
  const pairs: [number, number][] = [];
  for (let i = 0; i < pre; i++) pairs.push([i, i]);
  const A = na.slice(pre, na.length - suf);
  const B = nb.slice(pre, nb.length - suf);
  const n = A.length;
  const m = B.length;
  if (n && m) {
    if (n * m <= 6_000_000) {
      // Programação dinâmica clássica (LCS)
      const W = m + 1;
      const dp = new Uint32Array((n + 1) * W);
      for (let i = n - 1; i >= 0; i--)
        for (let j = m - 1; j >= 0; j--)
          dp[i * W + j] = A[i] === B[j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
      let i = 0;
      let j = 0;
      while (i < n && j < m) {
        if (A[i] === B[j]) {
          pairs.push([pre + i, pre + j]);
          i++;
          j++;
        } else if (dp[(i + 1) * W + j] >= dp[i * W + j + 1]) i++;
        else j++;
      }
    } else {
      // Texto muito grande e muito alterado: casamento guloso com janela
      let j = 0;
      for (let i = 0; i < n && j < m; i++) {
        const k = B.indexOf(A[i], j);
        if (k >= 0 && k - j < 40) {
          pairs.push([pre + i, pre + k]);
          j = k + 1;
        }
      }
    }
  }
  for (let s = suf; s > 0; s--) pairs.push([na.length - s, nb.length - s]);
  return pairs;
};

// Diferenças entre as palavras atuais e um texto novo
export const diffText = (words: Word[], text: string, offset = 0): Change[] => {
  const oldT = words.map((w) => w.text);
  const newT = tokenize(text);
  const pairs = matchPairs(oldT, newT);
  const changes: Change[] = [];
  let pi = 0;
  let pj = 0;
  const flush = (i: number, j: number) => {
    if (i > pi || j > pj) changes.push({ from: offset + pi, to: offset + i, tokens: newT.slice(pj, j) });
  };
  for (const [i, j] of pairs) {
    flush(i, j);
    // Mesma palavra com outra grafia (acento, pontuação, maiúscula) também conta como troca
    if (oldT[i] !== newT[j]) changes.push({ from: offset + i, to: offset + i + 1, tokens: [newT[j]] });
    pi = i + 1;
    pj = j + 1;
  }
  flush(oldT.length, newT.length);
  // Junta trocas encostadas para ficarem legíveis na revisão
  const merged: Change[] = [];
  for (const c of changes) {
    const last = merged[merged.length - 1];
    if (last && last.to === c.from) merged.push({ ...merged.pop()!, to: c.to, tokens: [...last.tokens, ...c.tokens] });
    else merged.push(c);
  }
  return merged;
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;

// Distribui o tempo [start, end] entre tokens, proporcional ao tamanho de cada um
const spread = (tokens: string[], start: number, end: number): Word[] => {
  const weights = tokens.map((t) => norm(t).length + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  const span = Math.max(0, end - start);
  let t = start;
  return tokens.map((text, k) => {
    const d = (span * weights[k]) / total;
    const w = { text, start: r3(t), end: r3(k === tokens.length - 1 ? end : t + d) };
    t += d;
    return w;
  });
};

// Aplica as trocas (em ordem e sem sobreposição) e devolve a nova lista de palavras
export const applyChanges = (words: Word[], changes: Change[]): Word[] => {
  const sorted = [...changes].sort((a, b) => a.from - b.from);
  const out: Word[] = [];
  let i = 0;
  for (const c of sorted) {
    while (i < c.from) out.push(words[i++]);
    const old = words.slice(c.from, c.to);
    if (c.tokens.length) {
      if (old.length === c.tokens.length) {
        old.forEach((w, k) => out.push({ ...w, text: c.tokens[k] }));
      } else if (old.length) {
        out.push(...spread(c.tokens, old[0].start, old[old.length - 1].end));
      } else {
        // Inserção: usa a pausa entre as vizinhas, ou divide a palavra anterior se não houver pausa
        const prev = out[out.length - 1];
        const next = words[c.to];
        let a = prev ? prev.end : Math.max(0, (next?.start ?? 0.1) - 0.1);
        let b = next ? next.start : a + 0.1 * c.tokens.length;
        if (b - a < 0.04 * c.tokens.length && prev) {
          const mid = (prev.start + prev.end) / 2;
          out[out.length - 1] = { ...prev, end: r3(mid) };
          a = mid;
          b = Math.max(prev.end, mid + 0.04 * c.tokens.length);
        }
        out.push(...spread(c.tokens, a, Math.max(a, b)));
      }
    }
    i = c.to;
  }
  while (i < words.length) out.push(words[i++]);
  return out;
};

// Texto legível, com quebra de parágrafo nas pausas longas
export const wordsToText = (words: Word[], pause = 1.2) =>
  words
    .map((w, i) => (i > 0 && w.start - words[i - 1].end > pause ? `\n\n${w.text}` : w.text))
    .join(" ")
    .replace(/ \n\n/g, "\n\n");

// Uma palavra editada que virou várias (ou nenhuma)
export const editWord = (words: Word[], index: number, text: string): Word[] =>
  applyChanges(words, [{ from: index, to: index + 1, tokens: tokenize(text) }]);

// Localizar e substituir (sem diferenciar maiúsculas); devolve as trocas
export const replaceAll = (words: Word[], find: string, repl: string): Change[] => {
  const f = find.trim();
  if (!f) return [];
  const esc = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const text = words.map((w) => w.text).join(" ");
  const next = text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "giu"), repl.trim());
  return next === text ? [] : diffText(words, next);
};

export const countMatches = (words: Word[], find: string) => {
  const f = find.trim();
  if (!f) return 0;
  const esc = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const text = words.map((w) => w.text).join(" ");
  return (text.match(new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "giu")) ?? []).length;
};
