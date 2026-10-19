// Busca de ícones (Lucide) por nome e palavras-chave, aceitando termos em português.
import tags from "lucide-static/tags.json";
import { ICON_NAMES } from "../remotion/overlays";

const TAGS = tags as unknown as Record<string, string[]>;

// Sinônimos em português -> termos em inglês usados pelos ícones
const PT: Record<string, string[]> = {
  fabrica: ["factory", "industry"],
  industria: ["factory", "industry"],
  producao: ["factory", "production", "package"],
  maquina: ["cog", "settings", "machine"],
  engrenagem: ["cog", "settings"],
  papel: ["file", "paper", "scroll"],
  bobina: ["cylinder", "disc", "roll"],
  rolo: ["cylinder", "roll"],
  seguranca: ["shield", "safety", "hard-hat"],
  capacete: ["hard-hat"],
  epi: ["hard-hat", "shield"],
  acidente: ["alert-triangle", "siren", "ambulance"],
  alerta: ["alert", "warning", "triangle-alert"],
  perigo: ["alert", "skull", "flame"],
  fogo: ["flame", "fire"],
  equipe: ["users", "team", "group"],
  pessoas: ["users", "people"],
  pessoa: ["user", "person"],
  lider: ["crown", "user-star", "star"],
  meta: ["target", "goal", "flag"],
  objetivo: ["target", "goal"],
  resultado: ["trophy", "award", "chart"],
  recorde: ["trophy", "medal", "award"],
  premio: ["award", "trophy", "medal"],
  grafico: ["chart", "bar-chart", "line-chart"],
  crescimento: ["trending-up", "growth"],
  queda: ["trending-down", "decline"],
  dinheiro: ["dollar", "money", "banknote", "coins"],
  custo: ["dollar", "receipt", "coins"],
  tempo: ["clock", "timer", "hourglass"],
  relogio: ["clock", "watch"],
  turno: ["clock", "sun", "moon"],
  dia: ["sun", "calendar"],
  noite: ["moon"],
  calendario: ["calendar"],
  data: ["calendar"],
  caminhao: ["truck"],
  entrega: ["truck", "package"],
  caixa: ["package", "box"],
  pacote: ["package"],
  estoque: ["warehouse", "package", "boxes"],
  armazem: ["warehouse"],
  energia: ["zap", "bolt", "battery", "plug"],
  agua: ["droplet", "water", "waves"],
  vapor: ["cloud", "wind"],
  natureza: ["leaf", "tree", "sprout"],
  floresta: ["trees", "tree", "leaf"],
  arvore: ["tree", "trees"],
  sustentabilidade: ["leaf", "recycle", "sprout"],
  reciclagem: ["recycle"],
  ideia: ["lightbulb", "idea"],
  lampada: ["lightbulb"],
  qualidade: ["badge-check", "check", "star"],
  defeito: ["x-circle", "bug", "alert"],
  erro: ["x", "bug", "circle-x"],
  certo: ["check", "check-circle"],
  ok: ["check", "thumbs-up"],
  aprovado: ["check", "badge-check", "thumbs-up"],
  ferramenta: ["wrench", "hammer", "tool"],
  manutencao: ["wrench", "settings", "tool"],
  reuniao: ["users", "presentation", "messages"],
  comunicacao: ["message", "megaphone", "mail"],
  aviso: ["megaphone", "bell", "info"],
  email: ["mail"],
  telefone: ["phone"],
  documento: ["file-text", "clipboard"],
  relatorio: ["clipboard", "file-text", "chart"],
  lista: ["list", "list-checks", "clipboard-list"],
  checklist: ["list-checks", "clipboard-check"],
  saude: ["heart", "activity", "stethoscope"],
  coracao: ["heart"],
  medico: ["stethoscope", "hospital"],
  estrela: ["star"],
  casa: ["home", "house"],
  escritorio: ["building", "briefcase"],
  empresa: ["building", "briefcase"],
  localizacao: ["map-pin", "map"],
  mapa: ["map"],
  computador: ["laptop", "monitor"],
  dados: ["database", "chart"],
  nuvem: ["cloud"],
  seta: ["arrow-right", "arrow"],
  foguete: ["rocket"],
  velocidade: ["gauge", "zap", "rocket"],
  sorriso: ["smile"],
  feliz: ["smile", "party"],
  festa: ["party-popper"],
  parabens: ["party-popper", "trophy", "sparkles"],
  carro: ["car"],
  aviao: ["plane"],
  fone: ["headphones"],
  camera: ["camera", "video"],
  video: ["video", "film"],
  musica: ["music"],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

export const POPULAR = [
  "factory", "users", "shield-check", "hard-hat", "trending-up", "target", "trophy", "clock", "zap", "leaf",
  "package", "truck", "lightbulb", "check-circle", "alert-triangle", "wrench", "chart-bar", "award", "heart", "sparkles",
  "recycle", "droplet", "calendar", "megaphone", "rocket", "star", "thumbs-up", "flame", "gauge", "settings",
].filter((n) => ICON_NAMES.includes(n));

export const searchIcons = (query: string, limit = 120): string[] => {
  const q = norm(query);
  if (!q) return POPULAR;
  const terms = new Set<string>([q, ...(PT[q] ?? [])]);
  for (const [pt, en] of Object.entries(PT)) if (pt.startsWith(q) && q.length >= 3) en.forEach((t) => terms.add(t));
  const scored: [string, number][] = [];
  for (const name of ICON_NAMES) {
    let score = 0;
    for (const t of terms) {
      if (name === t) score = Math.max(score, 100);
      else if (name.startsWith(t)) score = Math.max(score, 60);
      else if (name.includes(t)) score = Math.max(score, 40);
      else if ((TAGS[name] ?? []).some((tag) => tag === t)) score = Math.max(score, 30);
      else if (t.length >= 4 && (TAGS[name] ?? []).some((tag) => tag.startsWith(t))) score = Math.max(score, 15);
    }
    if (score) scored.push([name, score - name.length * 0.1]);
  }
  return scored.sort((a, b) => b[1] - a[1]).slice(0, limit).map(([n]) => n);
};
