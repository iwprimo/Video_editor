// Modelo de dados compartilhado entre o editor e a composição do Remotion.
// Tudo o que aparece no vídeo vem deste objeto — o editor só altera o JSON.

export type Theme = {
  bg: string;
  glow: string;
  ink: string;
  muted: string;
  accent: string;
  rule: string;
};

export type FormatId = "landscape" | "portrait" | "square";

export const FORMATS: Record<FormatId, { label: string; width: number; height: number }> = {
  landscape: { label: "Horizontal 16:9 (1920×1080)", width: 1920, height: 1080 },
  portrait: { label: "Vertical 9:16 (1080×1920)", width: 1080, height: 1920 },
  square: { label: "Quadrado 1:1 (1080×1080)", width: 1080, height: 1080 },
};

export const FPS = 30;
export const MIN_SCENE_FRAMES = 30; // 1 s
export const MAX_SCENE_FRAMES = 30 * 30; // 30 s

// ---------- Efeitos e transições ----------

export type EffectCategory = "camera" | "color" | "overlay";

export type EffectType =
  | "zoomIn"
  | "zoomOut"
  | "pan"
  | "shake"
  | "pop"
  | "blurIn"
  | "bw"
  | "vintage"
  | "cinema"
  | "vivid"
  | "vignette"
  | "grain"
  | "scanlines"
  | "leak"
  | "letterbox"
  | "flash"
  | "glitch";

export type EffectInstance = { id: string; type: EffectType; intensity: number };

export type EffectMeta = {
  name: string;
  category: EffectCategory;
  description: string;
  // true = pode ser aplicado ao vídeo inteiro além de uma cena
  global: boolean;
};

export const EFFECTS: Record<EffectType, EffectMeta> = {
  zoomIn: { name: "Zoom lento", category: "camera", description: "Aproxima devagar durante a cena", global: false },
  zoomOut: { name: "Afastar", category: "camera", description: "Começa perto e se afasta", global: false },
  pan: { name: "Deslizar", category: "camera", description: "Movimento lateral contínuo", global: false },
  shake: { name: "Câmera na mão", category: "camera", description: "Tremor sutil e orgânico", global: true },
  pop: { name: "Impacto", category: "camera", description: "Entra com um leve soco de escala", global: false },
  blurIn: { name: "Foco de entrada", category: "camera", description: "Começa desfocado e ganha nitidez", global: false },
  bw: { name: "Preto e branco", category: "color", description: "Remove as cores", global: true },
  vintage: { name: "Vintage", category: "color", description: "Tons quentes e desbotados", global: true },
  cinema: { name: "Cinema", category: "color", description: "Contraste alto, sombras frias", global: true },
  vivid: { name: "Cores vivas", category: "color", description: "Mais saturação e contraste", global: true },
  vignette: { name: "Vinheta", category: "overlay", description: "Escurece as bordas do quadro", global: true },
  grain: { name: "Granulado", category: "overlay", description: "Textura de filme analógico", global: true },
  scanlines: { name: "Linhas de TV", category: "overlay", description: "Linhas horizontais de tela antiga", global: true },
  leak: { name: "Vazamento de luz", category: "overlay", description: "Manchas de luz quente em movimento", global: true },
  letterbox: { name: "Barras de cinema", category: "overlay", description: "Faixas em cima e embaixo", global: true },
  flash: { name: "Flash", category: "overlay", description: "Clarão no início", global: true },
  glitch: { name: "Glitch", category: "overlay", description: "Falha digital na entrada e na saída", global: true },
};

export const EFFECT_CATEGORIES: Record<EffectCategory, string> = {
  camera: "Câmera",
  color: "Cor",
  overlay: "Sobreposição",
};

export const DEFAULT_INTENSITY = 0.6;

export type TransitionType = "cut" | "fade" | "slide" | "wipe" | "flip" | "clockWipe" | "iris" | "pushCut";
export type Direction = "from-left" | "from-right" | "from-top" | "from-bottom";
export type TransitionSpec = {
  type: TransitionType;
  direction: Direction;
  duration: number;
  sfx?: "whoosh" | "swish" | "pop" | "none";
};

export const TRANSITIONS: Record<TransitionType, { name: string; description: string; directional: boolean }> = {
  cut: { name: "Corte seco", description: "Troca direta, sem transição", directional: false },
  fade: { name: "Dissolver", description: "Uma cena se funde na outra", directional: false },
  slide: { name: "Empurrar", description: "A nova cena empurra a anterior", directional: true },
  wipe: { name: "Cortina", description: "A nova cena cobre a anterior", directional: true },
  flip: { name: "Virar", description: "Gira como um cartão", directional: true },
  clockWipe: { name: "Relógio", description: "Revela em giro de ponteiro", directional: false },
  iris: { name: "Íris", description: "Abre em círculo a partir do centro", directional: false },
  pushCut: { name: "Corte com zoom", description: "Zoom rápido com clarão", directional: false },
};

export const DIRECTIONS: Record<Direction, string> = {
  "from-left": "Da esquerda",
  "from-right": "Da direita",
  "from-top": "De cima",
  "from-bottom": "De baixo",
};

export const DEFAULT_TRANSITION: TransitionSpec = { type: "cut", direction: "from-right", duration: 15 };
export const MIN_TRANSITION_FRAMES = 6;
export const MAX_TRANSITION_FRAMES = 60;

type SceneBase = {
  id: string;
  duration: number;
  effects?: EffectInstance[];
  transition?: TransitionSpec; // transição desta cena para a próxima
};

export type TitleScene = SceneBase & {
  type: "title";
  kicker: string;
  title: string;
  highlight: string; // trecho do título pintado com a cor de destaque
};

export type ChartScene = SceneBase & {
  type: "chart";
  title: string;
  subtitle: string;
  unit: string;
  data: { label: string; value: number }[];
};

export type StatsScene = SceneBase & {
  type: "stats";
  title: string;
  stats: { value: number; decimals: number; suffix: string; label: string }[];
};

export type TextScene = SceneBase & {
  type: "text";
  text: string;
  author: string;
};

export type OutroScene = SceneBase & {
  type: "outro";
  brand: string;
  tag: string;
};

// ---------- Vídeo gravado ----------

export type Segment = { start: number; end: number; punchIn?: boolean }; // trecho mantido, em segundos do arquivo original
export type Word = { text: string; start: number; end: number }; // palavra transcrita, em segundos do original

export type VideoScene = SceneBase & {
  type: "video";
  file: string; // nome do arquivo na pasta midia/ do servidor
  name: string; // nome original enviado
  srcDuration: number; // segundos
  srcWidth: number;
  srcHeight: number;
  segments: Segment[];
  words?: Word[];
  glossary?: string; // termos e nomes para a correção da transcrição por IA
  fit: "cover" | "contain";
  volume: number; // 0..1
  // --- Smart Reframe 9:16 (Fase 1) ---
  panX?: number; // -50..50 (%)
  panY?: number; // -50..50 (%)
  scale?: number; // 0.5..2.5 (padrão 1.0)
  bgMode?: "cover" | "contain" | "blur" | "black"; // modo de preenchimento de fundo
  blurRadius?: number; // raio do blur em px (padrão 25)
  blurBrightness?: number; // brilho do fundo desfocado 0..1 (padrão 0.55)
  // --- Punch-in Zooms (Fase 4) ---
  punchInPattern?: "none" | "alternate" | "manual"; // alternar nos cortes, sem zoom ou manual
  punchInZoom?: number; // 1.1..1.4 (padrão 1.2)
};

export type Scene = TitleScene | ChartScene | StatsScene | TextScene | OutroScene | VideoScene;
export type SceneType = Scene["type"];

export type BackgroundAudioPreset = "lofi-chill" | "corporate-upbeat" | "cinematic-pulse" | "custom";

export type BackgroundAudio = {
  enabled: boolean;
  preset?: BackgroundAudioPreset;
  file?: string; // arquivo na pasta midia/ ou data URL
  name?: string; // nome legível da faixa
  volume: number; // 0..1 (padrão 0.3)
  loop?: boolean; // padrão true
  ducking: boolean; // ativa auto-ducking inteligente durante a fala
  duckingVolume: number; // volume reduzido durante a fala (ex: 0.08 = 8%)
  duckingRampMs?: number; // transição suave de entrada/saída em ms (padrão 250ms)
};

export const DEFAULT_BACKGROUND_AUDIO: BackgroundAudio = {
  enabled: false,
  preset: "lofi-chill",
  volume: 0.3,
  loop: true,
  ducking: true,
  duckingVolume: 0.08,
  duckingRampMs: 250,
};

export type ProgressBarSettings = {
  enabled: boolean;
  position: "top" | "bottom";
  height: number; // altura em pixels (ex: 6)
  color: string; // cor de preenchimento da barra
  background?: string; // cor do trilho/fundo da barra
};

export const DEFAULT_PROGRESS_BAR: ProgressBarSettings = {
  enabled: false,
  position: "bottom",
  height: 6,
  color: "#ffd84d",
  background: "rgba(255, 255, 255, 0.2)",
};

export type Project = {
  name: string;
  format: FormatId;
  theme: Theme;
  scenes: Scene[];
  effects?: EffectInstance[]; // aplicados ao vídeo inteiro
  overlays?: Overlay[];
  captions?: CaptionSettings;
  assets?: ImageAsset[]; // imagens enviadas ou geradas
  mediaBase?: string; // preenchido pelo servidor na exportação
  audio?: BackgroundAudio; // trilha sonora e auto-ducking (Fase 3)
  progressBar?: ProgressBarSettings; // barra de progresso visual de retenção (Fase 4)
  headline?: HeadlineSettings; // manchete de topo / gancho viral (Fase A)
};

// ---------- Tipografia Viral ----------

export const VIRAL_FONTS = [
  { id: "Inter", name: "Inter (Padrão)", family: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { id: "TheBoldFont", name: "The Bold Font (Viral)", family: "'The Bold Font', 'Impact', sans-serif" },
  { id: "Montserrat", name: "Montserrat Black", family: "'Montserrat', sans-serif" },
  { id: "BebasNeue", name: "Bebas Neue (Condensada)", family: "'Bebas Neue', sans-serif" },
  { id: "Impact", name: "Impact Clássico", family: "Impact, sans-serif" },
] as const;

export type ViralFontId = typeof VIRAL_FONTS[number]["id"];

// ---------- Manchetes de Topo (Ganchos Virais) ----------

export type HeadlineStyle = "badge" | "bold" | "highlight" | "neon";

export type HeadlineSettings = {
  enabled: boolean;
  text: string;
  durationSeconds: number; // 0 = vídeo todo, 3 = primeiros 3s, 5 = primeiros 5s
  style: HeadlineStyle;
  color?: string; // cor de destaque / fundo do badge
  textColor?: string; // cor do texto
  fontFamily?: string;
  fontSize?: number; // escala 0.8..1.5
  uppercase?: boolean;
};

export const DEFAULT_HEADLINE: HeadlineSettings = {
  enabled: false,
  text: "O SEGREDO QUE NINGUÉM CONTA",
  durationSeconds: 3,
  style: "badge",
  color: "#ffd84d",
  textColor: "#121319",
  fontSize: 1.0,
  uppercase: true,
  fontFamily: "Inter",
};

// ---------- Legendas ----------

export type CaptionStyle =
  | "karaoke"
  | "pop"
  | "box"
  | "minimal"
  | "highlight"
  | "impact"
  | "duo"
  | "bounce"
  | "rise"
  | "neon"
  | "block"
  | "typewriter"
  | "outline"
  | "hormozi"
  | "mrbeast"
  | "glow";
export type CaptionSettings = {
  enabled: boolean;
  style: CaptionStyle;
  position: "bottom" | "middle" | "top";
  offsetY?: number; // 10..90 (%) - posição vertical contínua
  color: string; // cor de destaque da palavra falada
  textColor?: string; // cor padrão do texto (padrão #f7f7fa)
  size: number; // 1 = padrão
  activeScale?: number; // escala extra no destaque
  uppercase: boolean;
  wordsPerPage: number; // máximo de palavras por bloco
  autoEmoji?: boolean; // insere emojis contextuais automáticos
  fontFamily?: string; // fonte viral personalizada
};
export const DEFAULT_CAPTIONS: CaptionSettings = {
  enabled: true,
  style: "highlight",
  position: "bottom",
  offsetY: 74, // dentro da safe zone padrão de Reels/TikTok
  color: "#ffd84d",
  textColor: "#f7f7fa",
  size: 1,
  uppercase: false,
  wordsPerPage: 3,
  autoEmoji: false,
};
export const CAPTION_STYLES: Record<CaptionStyle, string> = {
  hormozi: "Hormozi (Bold + Ângulo)",
  mrbeast: "MrBeast (Ultra Pop)",
  glow: "Neon Glow (Aura)",
  highlight: "Marca-texto (fundo na palavra)",
  impact: "Impacto (caixa alta, contorno)",
  duo: "Duas cores (alterna as cores)",
  bounce: "Pulo (palavra a palavra)",
  rise: "Subida suave",
  neon: "Neon",
  block: "Faixa colorida",
  typewriter: "Máquina de escrever",
  karaoke: "Karaokê (destaca a palavra)",
  pop: "Pop (uma palavra por vez)",
  box: "Caixa escura",
  outline: "Contorno fino",
  minimal: "Simples",
};

// Ajustes que cada estilo usa por padrão ao ser escolhido
export const CAPTION_PRESETS: Record<CaptionStyle, { wordsPerPage: number; uppercase?: boolean; hint: string }> = {
  hormozi: { wordsPerPage: 2, uppercase: true, hint: "Estilo Alex Hormozi: fonte pesada, contorno espesso, palavra ativa inclinada e em destaque vibrante." },
  mrbeast: { wordsPerPage: 2, uppercase: true, hint: "Estilo MrBeast: contorno preto ultra grosso, alto impacto, fontes maciças e cores neon dinâmicas." },
  glow: { wordsPerPage: 3, hint: "Aura néon pulsante ao redor da palavra ativa, atraindo os olhos para a fala." },
  highlight: { wordsPerPage: 3, hint: "A palavra falada ganha um fundo colorido, como nos editores de Reels e TikTok." },
  impact: { wordsPerPage: 2, uppercase: true, hint: "Letras grossas em caixa alta, contorno escuro e a palavra falada maior e colorida." },
  duo: { wordsPerPage: 3, uppercase: true, hint: "Palavras alternando a cor de destaque e a complementar, com contorno grosso; a falada fica branca e inclinada." },
  bounce: { wordsPerPage: 4, hint: "Cada palavra entra pulando no momento em que é dita." },
  rise: { wordsPerPage: 4, hint: "As palavras surgem de baixo, com desfoque suave." },
  neon: { wordsPerPage: 4, hint: "Texto com brilho na cor de destaque; a palavra falada acende." },
  block: { wordsPerPage: 4, hint: "Frase sobre uma faixa na cor de destaque; a palavra falada fica invertida." },
  typewriter: { wordsPerPage: 6, hint: "As letras aparecem conforme a fala, com cursor piscando." },
  karaoke: { wordsPerPage: 5, hint: "Frase inteira; a palavra falada muda de cor." },
  pop: { wordsPerPage: 1, hint: "Uma palavra por vez, grande, entrando com um salto." },
  box: { wordsPerPage: 6, hint: "Frase sobre uma caixa escura, legível em qualquer fundo." },
  outline: { wordsPerPage: 7, hint: "Texto branco com contorno fino, discreto, para conteúdo informativo." },
  minimal: { wordsPerPage: 7, hint: "Texto branco com sombra, sem destaque." },
};

// ---------- Ilustrações (sobreposições) ----------

export type ImageAsset = {
  id: string;
  file: string;
  name: string;
  width: number;
  height: number;
  kind?: "image" | "video";
  generated?: boolean;
  prompt?: string;
  provider?: "gemini" | "openai";
};

export type OverlayKind =
  | "image"
  | "video"
  | "icon"
  | "lowerThird"
  | "callout"
  | "keyword"
  | "counter"
  | "barChart"
  | "progress"
  | "checklist"
  | "cta";

export type OverlayPosition =
  | "full"
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type Overlay = {
  id: string;
  sceneId: string;
  at: number; // início em segundos: do arquivo original (cena de vídeo) ou da própria cena (demais)
  duration: number; // segundos
  kind: OverlayKind;
  position: OverlayPosition;
  size: number; // 0.15..1, fração do menor lado do quadro
  props: Record<string, unknown>;
  sfx?: "pop" | "whoosh" | "ding" | "click" | "shutter" | "none"; // efeito sonoro ao surgir
};

export const POSITIONS: Record<OverlayPosition, string> = {
  full: "Tela cheia",
  center: "Centro",
  top: "Topo",
  bottom: "Base",
  left: "Esquerda",
  right: "Direita",
  "top-left": "Topo à esquerda",
  "top-right": "Topo à direita",
  "bottom-left": "Base à esquerda",
  "bottom-right": "Base à direita",
};

export const OVERLAYS: Record<
  OverlayKind,
  { name: string; description: string; position: OverlayPosition; size: number; duration: number; props: Record<string, unknown> }
> = {
  image: { name: "Imagem", description: "Foto, logo ou print", position: "right", size: 0.55, duration: 4, props: { assetId: "", animation: "pop", rounded: true } },
  video: { name: "B-Roll (Vídeo)", description: "Clipe ou corte de apoio secundário", position: "full", size: 1, duration: 3.5, props: { assetId: "", fit: "cover", rounded: false, volume: 0 } },
  icon: { name: "Ícone", description: "Ícone com legenda opcional", position: "top-right", size: 0.3, duration: 3, props: { name: "lightbulb", label: "", color: "" } },
  lowerThird: { name: "Nome e cargo", description: "Faixa de identificação na base", position: "bottom-left", size: 0.6, duration: 5, props: { title: "Nome Sobrenome", subtitle: "Cargo · Área" } },
  callout: { name: "Destaque", description: "Etiqueta com uma informação curta", position: "top-left", size: 0.5, duration: 3.5, props: { text: "Ponto importante" } },
  keyword: { name: "Palavra-chave", description: "Texto grande e cinético", position: "center", size: 0.8, duration: 2.5, props: { text: "RESULTADO" } },
  counter: { name: "Contador", description: "Número que sobe até o valor", position: "top-right", size: 0.4, duration: 4, props: { value: 98.5, decimals: 1, prefix: "", suffix: "%", label: "Eficiência" } },
  barChart: { name: "Gráfico", description: "Barras animadas sobre o vídeo", position: "right", size: 0.55, duration: 5, props: { title: "Produção", data: [{ label: "Jan", value: 40 }, { label: "Fev", value: 65 }, { label: "Mar", value: 82 }] } },
  progress: { name: "Anel de progresso", description: "Porcentagem em anel animado", position: "top-right", size: 0.35, duration: 4, props: { value: 75, label: "Meta" } },
  checklist: { name: "Lista", description: "Itens que vão sendo marcados", position: "left", size: 0.55, duration: 6, props: { title: "Etapas", items: ["Planejar", "Executar", "Revisar"] } },
  cta: { name: "Chamada", description: "Botão de ação no fim", position: "bottom", size: 0.5, duration: 4, props: { text: "Saiba mais" } },
};

export const SCENE_LABELS: Record<SceneType, string> = {
  title: "Título",
  chart: "Gráfico",
  stats: "Números",
  text: "Frase",
  outro: "Encerramento",
  video: "Vídeo",
};

export const THEME_PRESETS: { name: string; theme: Theme }[] = [
  {
    name: "Noite",
    theme: { bg: "#11131c", glow: "#1d2236", ink: "#eef0f7", muted: "#8e94ab", accent: "#7c8cff", rule: "#2a3048" },
  },
  {
    name: "Floresta",
    theme: { bg: "#0f1714", glow: "#17261f", ink: "#edf4ef", muted: "#8ea398", accent: "#5fcf8f", rule: "#24362d" },
  },
  {
    name: "Papel",
    theme: { bg: "#f6f3ee", glow: "#ffffff", ink: "#22201c", muted: "#6f685d", accent: "#c2551f", rule: "#e2dcd2" },
  },
  {
    name: "Âmbar",
    theme: { bg: "#17130e", glow: "#2a2117", ink: "#f5efe6", muted: "#a89a87", accent: "#f0a340", rule: "#3a2f22" },
  },
  {
    name: "Hormozi",
    theme: { bg: "#0d0f17", glow: "#2a220e", ink: "#f7f7fa", muted: "#a0a4b8", accent: "#ffd84d", rule: "#2d2716" },
  },
  {
    name: "MrBeast",
    theme: { bg: "#080c14", glow: "#0e291c", ink: "#ffffff", muted: "#8ea398", accent: "#22c55e", rule: "#173024" },
  },
  {
    name: "Neon Glow",
    theme: { bg: "#0c0a17", glow: "#281233", ink: "#fbf6ff", muted: "#9d94b0", accent: "#ec4899", rule: "#311c3d" },
  },
  {
    name: "Minimal",
    theme: { bg: "#0b0f19", glow: "#15203b", ink: "#e2e8f0", muted: "#64748b", accent: "#38bdf8", rule: "#1e293b" },
  },
];

export const uid = () => Math.random().toString(36).slice(2, 9);

export const makeScene = (type: SceneType): Scene => {
  const id = uid();
  switch (type) {
    case "title":
      return { id, type, duration: 90, kicker: "Apresentação", title: "Seu título aqui", highlight: "título" };
    case "chart":
      return {
        id,
        type,
        duration: 120,
        title: "Resultado da semana",
        subtitle: "Valores por dia",
        unit: "",
        data: [
          { label: "Seg", value: 62 },
          { label: "Ter", value: 78 },
          { label: "Qua", value: 54 },
          { label: "Qui", value: 91 },
          { label: "Sex", value: 84 },
        ],
      };
    case "stats":
      return {
        id,
        type,
        duration: 105,
        title: "Em números",
        stats: [
          { value: 98.4, decimals: 1, suffix: "%", label: "Eficiência" },
          { value: 1250, decimals: 0, suffix: " t", label: "Produção" },
          { value: 0, decimals: 0, suffix: "", label: "Acidentes" },
        ],
      };
    case "text":
      return { id, type, duration: 105, text: "Uma frase curta e marcante para fixar a ideia.", author: "" };
    case "outro":
      return { id, type, duration: 75, brand: "Sua marca", tag: "Obrigado por assistir" };
    case "video":
      throw new Error("Cenas de vídeo são criadas ao importar um arquivo");
  }
};

// ---------- Mapeamento de tempo das cenas de vídeo ----------

export const segFrames = (seg: Segment) => Math.max(1, Math.round((seg.end - seg.start) * FPS));
export const videoFrames = (segments: Segment[]) => Math.max(1, segments.reduce((a, s) => a + segFrames(s), 0));

// Normaliza: ordena, junta sobreposições e descarta trechos minúsculos
export const normalizeSegments = (segments: Segment[], srcDuration: number): Segment[] => {
  const sorted = segments
    .map((s) => ({ start: Math.max(0, Math.min(s.start, srcDuration)), end: Math.max(0, Math.min(s.end, srcDuration)) }))
    .filter((s) => s.end - s.start >= 1 / FPS)
    .sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start <= last.end + 0.001) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out.length ? out : [{ start: 0, end: Math.min(srcDuration, 1) }];
};

// Remove um intervalo [from, to] dos trechos mantidos
export const cutRange = (segments: Segment[], from: number, to: number): Segment[] => {
  const out: Segment[] = [];
  for (const s of segments) {
    if (to <= s.start || from >= s.end) out.push(s);
    else {
      if (from > s.start) out.push({ start: s.start, end: from });
      if (to < s.end) out.push({ start: to, end: s.end });
    }
  }
  return out;
};

// Devolve um intervalo [from, to] aos trechos mantidos
export const restoreRange = (segments: Segment[], from: number, to: number, srcDuration: number) =>
  normalizeSegments([...segments, { start: from, end: to }], srcDuration);

// Segundos do original -> segundos dentro da cena editada (null se caiu num corte)
export const sourceToLocal = (segments: Segment[], t: number, snap = true): number | null => {
  let acc = 0;
  for (const s of segments) {
    const len = segFrames(s) / FPS;
    if (t < s.start) return snap ? acc : null;
    if (t <= s.end) return acc + Math.min(len, t - s.start);
    acc += len;
  }
  return snap ? acc : null;
};

// Segundos dentro da cena editada -> segundos do original
export const localToSource = (segments: Segment[], local: number): number => {
  let acc = 0;
  for (const s of segments) {
    const len = segFrames(s) / FPS;
    if (local < acc + len) return s.start + (local - acc);
    acc += len;
  }
  const last = segments[segments.length - 1];
  return last ? last.end : 0;
};

export const withVideoDuration = <T extends Scene>(s: T): T =>
  s.type === "video" && s.duration !== videoFrames(s.segments) ? ({ ...s, duration: videoFrames(s.segments) } as T) : s;

// Garante que a duração das cenas de vídeo bate com os trechos mantidos
export const normalizeProject = (p: Project): Project =>
  p.scenes.some((s) => s.type === "video" && s.duration !== videoFrames(s.segments))
    ? { ...p, scenes: p.scenes.map((s) => withVideoDuration(s)) }
    : p;

// Janela de uma ilustração na linha do tempo final (em quadros)
export const overlayWindow = (p: Project, ov: Overlay): { from: number; duration: number } | null => {
  const i = p.scenes.findIndex((s) => s.id === ov.sceneId);
  if (i < 0) return null;
  const scene = p.scenes[i];
  const start = sceneStarts(p.scenes)[i];
  const local = scene.type === "video" ? sourceToLocal(scene.segments, ov.at) ?? 0 : ov.at;
  const from = start + Math.round(local * FPS);
  const total = totalFrames(p);
  if (from >= total) return null;
  return { from, duration: Math.max(1, Math.min(Math.round(ov.duration * FPS), total - from)) };
};

// Cena e tempo de origem a partir de um quadro da linha do tempo final
export const locateFrame = (p: Project, frame: number): { scene: Scene; at: number } | null => {
  const st = sceneStarts(p.scenes);
  for (let i = p.scenes.length - 1; i >= 0; i--) {
    if (frame >= st[i]) {
      const scene = p.scenes[i];
      const local = Math.min(scene.duration - 1, frame - st[i]) / FPS;
      return { scene, at: scene.type === "video" ? localToSource(scene.segments, local) : local };
    }
  }
  return null;
};

export type OutputWord = { text: string; startMs: number; endMs: number };

// Palavras de todas as cenas de vídeo já posicionadas no tempo final (palavras cortadas somem)
export const outputWords = (p: Project): OutputWord[] => {
  const st = sceneStarts(p.scenes);
  const out: OutputWord[] = [];
  p.scenes.forEach((s, i) => {
    if (s.type !== "video" || !s.words?.length) return;
    const base = (st[i] / FPS) * 1000;
    const end = (s.duration / FPS) * 1000;
    for (const w of s.words) {
      const mid = (w.start + w.end) / 2;
      if (sourceToLocal(s.segments, mid, false) === null) continue;
      const a = sourceToLocal(s.segments, w.start) ?? 0;
      const b = sourceToLocal(s.segments, w.end) ?? a;
      const startMs = base + a * 1000;
      const endMs = Math.min(base + end, base + Math.max(b, a + 0.05) * 1000);
      out.push({ text: w.text, startMs, endMs });
    }
  });
  return out;
};

// Duração efetiva da transição da cena i para a próxima (0 = corte seco).
// Nunca maior que as cenas vizinhas, como exige o TransitionSeries.
export const transitionFrames = (scenes: Scene[], i: number) => {
  const t = scenes[i]?.transition;
  const next = scenes[i + 1];
  if (!t || t.type === "cut" || !next) return 0;
  const max = Math.min(scenes[i].duration, next.duration) - 2;
  return Math.max(0, Math.min(t.duration, max));
};

// Início de cada cena na linha do tempo, já descontando as sobreposições
export const sceneStarts = (scenes: Scene[]) => {
  const out: number[] = [];
  let acc = 0;
  scenes.forEach((s, i) => {
    out.push(acc);
    acc += s.duration - transitionFrames(scenes, i);
  });
  return out;
};

export const totalFrames = (p: Project) =>
  Math.max(1, p.scenes.reduce((sum, sc, i) => sum + sc.duration - transitionFrames(p.scenes, i), 0));

export const makeEffect = (type: EffectType, intensity = DEFAULT_INTENSITY): EffectInstance => ({ id: uid(), type, intensity });

export const defaultProject = (): Project => ({
  name: "Novo vídeo",
  format: "landscape",
  theme: THEME_PRESETS[0].theme,
  scenes: [
    {
      ...(makeScene("title") as TitleScene),
      kicker: "Demo",
      title: "Vídeo feito em React",
      highlight: "React",
      effects: [makeEffect("zoomIn")],
      transition: { type: "fade", direction: "from-right", duration: 15 },
    },
    { ...makeScene("chart"), transition: { type: "slide", direction: "from-right", duration: 18 } },
    { ...makeScene("stats"), transition: { type: "wipe", direction: "from-bottom", duration: 18 } },
    { ...(makeScene("outro") as OutroScene), brand: "Remotion", tag: "Editado no seu navegador", effects: [makeEffect("leak", 0.5)] },
  ],
  effects: [makeEffect("vignette", 0.5)],
});

// ---------- Brand Kits & Export Presets (Fase 5) ----------

export type BrandKit = {
  id: string;
  name: string;
  description: string;
  theme: Theme;
  captions: Partial<CaptionSettings>;
  progressBar?: Partial<ProgressBarSettings>;
  audio?: Partial<BackgroundAudio>;
};

export const BRAND_KITS: BrandKit[] = [
  {
    id: "hormozi",
    name: "Alex Hormozi Viral",
    description: "Alto contraste escuro com destaque amarelo ouro, legendas angulares em caixa alta, zoom dinâmico e barra de retenção na base.",
    theme: { bg: "#0d0f17", glow: "#2a220e", ink: "#f7f7fa", muted: "#a0a4b8", accent: "#ffd84d", rule: "#2d2716" },
    captions: {
      enabled: true,
      style: "hormozi",
      position: "bottom",
      offsetY: 74,
      color: "#ffd84d",
      textColor: "#ffffff",
      size: 1.05,
      activeScale: 1.18,
      uppercase: true,
      wordsPerPage: 2,
      autoEmoji: true,
    },
    progressBar: { enabled: true, position: "bottom", height: 6, color: "#ffd84d" },
    audio: { enabled: true, preset: "lofi-chill", volume: 0.25, ducking: true, duckingVolume: 0.08, duckingRampMs: 250 },
  },
  {
    id: "mrbeast",
    name: "MrBeast Ultra Pop",
    description: "Cores neon vibrantes em fundo escuro profundo, legendas MrBeast de máximo impacto com salto 125%, emojis automáticos e áudio upbeat.",
    theme: { bg: "#080c14", glow: "#0e291c", ink: "#ffffff", muted: "#8ea398", accent: "#22c55e", rule: "#173024" },
    captions: {
      enabled: true,
      style: "mrbeast",
      position: "bottom",
      offsetY: 74,
      color: "#22c55e",
      textColor: "#ffffff",
      size: 1.1,
      activeScale: 1.25,
      uppercase: true,
      wordsPerPage: 2,
      autoEmoji: true,
    },
    progressBar: { enabled: true, position: "bottom", height: 6, color: "#22c55e" },
    audio: { enabled: true, preset: "corporate-upbeat", volume: 0.3, ducking: true, duckingVolume: 0.08, duckingRampMs: 200 },
  },
  {
    id: "glow",
    name: "Neon Glow (Aura)",
    description: "Estética futurista e imersiva com aura neon magenta/rosa, legendas com brilho suave e barra de progresso no topo.",
    theme: { bg: "#0c0a17", glow: "#281233", ink: "#fbf6ff", muted: "#9d94b0", accent: "#ec4899", rule: "#311c3d" },
    captions: {
      enabled: true,
      style: "glow",
      position: "bottom",
      offsetY: 74,
      color: "#ec4899",
      textColor: "#fdf4ff",
      size: 1.0,
      activeScale: 1.1,
      uppercase: false,
      wordsPerPage: 3,
      autoEmoji: true,
    },
    progressBar: { enabled: true, position: "top", height: 5, color: "#ec4899" },
    audio: { enabled: true, preset: "cinematic-pulse", volume: 0.25, ducking: true, duckingVolume: 0.07, duckingRampMs: 250 },
  },
  {
    id: "minimal",
    name: "Clean Minimalist",
    description: "Design sóbrio e elegante com fundo ardósia escuro, destaque azul céu, marca-texto translúcido e barra fina discreta.",
    theme: { bg: "#0b0f19", glow: "#15203b", ink: "#e2e8f0", muted: "#64748b", accent: "#38bdf8", rule: "#1e293b" },
    captions: {
      enabled: true,
      style: "highlight",
      position: "bottom",
      offsetY: 74,
      color: "#38bdf8",
      textColor: "#f8fafc",
      size: 1.0,
      activeScale: 1.08,
      uppercase: false,
      wordsPerPage: 3,
      autoEmoji: false,
    },
    progressBar: { enabled: true, position: "bottom", height: 4, color: "#38bdf8" },
    audio: { enabled: true, preset: "lofi-chill", volume: 0.2, ducking: true, duckingVolume: 0.06, duckingRampMs: 300 },
  },
  {
    id: "corporate",
    name: "Corporate Authority",
    description: "Paleta corporativa azul marinho e royal blue, legendas sóbrias em caixa escura e visual profissional para LinkedIn e marcas B2B.",
    theme: { bg: "#080e1e", glow: "#122045", ink: "#f1f5f9", muted: "#94a3b8", accent: "#3b82f6", rule: "#1e293b" },
    captions: {
      enabled: true,
      style: "box",
      position: "bottom",
      offsetY: 74,
      color: "#3b82f6",
      textColor: "#ffffff",
      size: 1.0,
      activeScale: 1.05,
      uppercase: false,
      wordsPerPage: 4,
      autoEmoji: false,
    },
    progressBar: { enabled: true, position: "bottom", height: 5, color: "#3b82f6" },
    audio: { enabled: false, preset: "corporate-upbeat", volume: 0.25, ducking: true, duckingVolume: 0.08, duckingRampMs: 250 },
  },
];

export type ExportPlatform = "reels" | "tiktok" | "shorts" | "feed" | "landscape";
export type ExportQuality = "standard" | "high";
export type ExportOptions = {
  platform: ExportPlatform;
  quality: ExportQuality;
  customName?: string;
};

export const EXPORT_PLATFORMS: Record<
  ExportPlatform,
  { name: string; format: FormatId; width: number; height: number; fps: number; crf: number; hint: string }
> = {
  reels: {
    name: "Instagram Reels",
    format: "portrait",
    width: 1080,
    height: 1920,
    fps: 30,
    crf: 18,
    hint: "1080×1920 (9:16) · Otimizado com margem para safe zones do Reels",
  },
  tiktok: {
    name: "TikTok",
    format: "portrait",
    width: 1080,
    height: 1920,
    fps: 30,
    crf: 18,
    hint: "1080×1920 (9:16) · Máxima nitidez e contraste para o feed Para Você",
  },
  shorts: {
    name: "YouTube Shorts",
    format: "portrait",
    width: 1080,
    height: 1920,
    fps: 30,
    crf: 18,
    hint: "1080×1920 (9:16) · Perfil ideal para o algoritmo do YouTube Shorts",
  },
  feed: {
    name: "Feed Quadrado (1:1)",
    format: "square",
    width: 1080,
    height: 1080,
    fps: 30,
    crf: 20,
    hint: "1080×1080 (1:1) · Ideal para postagens no feed do Instagram e LinkedIn",
  },
  landscape: {
    name: "Horizontal (16:9)",
    format: "landscape",
    width: 1920,
    height: 1080,
    fps: 30,
    crf: 20,
    hint: "1920×1080 (16:9) · Formato tradicional para YouTube e computadores",
  },
};
