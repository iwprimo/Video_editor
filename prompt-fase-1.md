# Prompt de Execução — Fase 1: Fundação 9:16, Safe Zones & Smart Reframe

> **Projeto:** `editor-video` (Remotion 4 + React 19 + Vite + TypeScript)  
> **Objetivo:** Implementar a Fase 1 da transformação do editor em uma Central de Produção de Reels, Shorts e TikTok, garantindo enquadramento vertical inteligente e visualização de zonas seguras das redes sociais sem regressões.

---

## 🎯 Escopo da Fase 1

1. **Expansão do Modelo de Dados (`src/remotion/types.ts`)**:
   - Adicionar propriedades de enquadramento na cena de vídeo: `panX`, `panY`, `scale`, `bgMode`, `blurRadius`, `blurBrightness`.
   - Todos os campos devem ser estritamente opcionais para manter 100% de compatibilidade retroativa.

2. **Renderização no Remotion (`src/remotion/Video.tsx`)**:
   - Na cena de vídeo (`VideoView`), se o modo for `blur` (ou quando em projeto vertical 9:16 com vídeo 16:9 sem corte cover forçado):
     - Renderizar uma camada de fundo preenchendo 100% da tela com o mesmo vídeo ampliado (`scale(1.35)`), com filtro CSS `blur` e `brightness` reduzido, **com áudio obrigatoriamente mutado (`volume={() => 0}`)**.
     - Renderizar o vídeo principal em primeiro plano nítido, centralizado (`contain`), aplicando os deslocamentos `panX` e `panY` e escala `scale`.
   - Se o modo for `cover`, preencher a tela inteira aplicando `panX` e `panY` para reenquadramento de corte.
   - Se o modo for `contain` ou `black`, manter barras pretas clássicas.

3. **Painel de Controle de Enquadramento (`src/editor/VideoPanel.tsx`)**:
   - Adicionar uma seção **"Enquadramento 9:16 (Smart Reframe)"** no painel da cena de vídeo:
     - Botões rápidos para alternar `bgMode`:
       - `Desfocado (Blur)`
       - `Preencher (Cover)`
       - `Ajustar (Contain)`
       - `Fundo Preto`
     - Slider de **Posição Horizontal (Pan X)**: `-50%` a `+50%` (ajuste fino para manter o orador no centro).
     - Slider de **Escala / Zoom**: `80%` a `200%`.
     - Slider de **Intensidade do Desfoque** (visível quando `bgMode === "blur"`): `10px` a `50px`.
     - Botão de resetar valores padrão (`Pan X: 0%`, `Zoom: 100%`).

4. **Visualizador de Safe Zones (`src/editor/App.tsx` e `src/editor/styles.css`)**:
   - Adicionar estado `showSafeZones` (booleano, ativo por padrão quando `project.format === "portrait"`).
   - Inserir botão de alternância `[🛡️ Safe Zones]` na barra superior de controles do player.
   - Dentro de `.player-frame` (em `App.tsx`), renderizar um componente `<SafeZonesOverlay />` absoluto e sem captura de cliques (`pointer-events: none`):
     - **Margem Direita (TikTok/Reels)**: Área dos ícones de like, comentários, favoritos e compartilhamento (largura ~18%, margem inferior a 25%).
     - **Margem Inferior**: Área reservada para título do post, nome de usuário, hashtags e nome da trilha de áudio (altura ~22%).
     - **Margem Superior**: Área de cabeçalho do app (altura ~10%).
     - **Área Segura Central**: Caixa pontilhada destacando onde textos, legendas e ilustrações devem se concentrar.

---

## 🛠️ Especificação de Código por Arquivo

### 1. `src/remotion/types.ts`
Localizar `export type VideoScene = SceneBase & { ... }` e adicionar:
```typescript
export type VideoScene = SceneBase & {
  type: "video";
  file: string;
  name: string;
  srcDuration: number;
  srcWidth: number;
  srcHeight: number;
  segments: Segment[];
  words?: Word[];
  glossary?: string;
  fit: "cover" | "contain";
  volume: number;
  // --- Novos campos Fase 1: Smart Reframe 9:16 ---
  panX?: number; // -50 a +50 (%)
  panY?: number; // -50 a +50 (%)
  scale?: number; // 0.5 a 2.5 (padrão 1.0)
  bgMode?: "cover" | "contain" | "blur" | "black"; // padrão 'blur' se vídeo horizontal em tela 9:16
  blurRadius?: number; // padrão 25px
  blurBrightness?: number; // padrão 0.55
};
```

### 2. `src/remotion/Video.tsx`
Atualizar `VideoView` para suportar a camada de desfoque mutada e transformações de pan/scale:
```tsx
const VideoView: React.FC<{ s: VideoScene; mediaBase: string }> = ({ s, mediaBase }) => {
  const src = `${mediaBase}/media/${s.file}`;
  const [failed, setFailed] = useState(false);
  const onError = getRemotionEnvironment().isPlayer ? () => setFailed(true) : undefined;
  const { portrait } = useUnit();

  // Detecta se é vídeo horizontal em tela vertical
  const isHorizontalVideo = s.srcWidth > s.srcHeight;
  const is916 = portrait;
  const effectiveBgMode = s.bgMode ?? (is916 && isHorizontalVideo ? "blur" : (s.fit ?? "cover"));
  const panX = s.panX ?? 0;
  const panY = s.panY ?? 0;
  const scale = s.scale ?? 1.0;
  const blurRadius = s.blurRadius ?? 25;
  const blurBrightness = s.blurBrightness ?? 0.55;

  let from = 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
      {failed ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "#14161f", color: "#c9cddb", fontFamily: FONT, fontSize: 28, textAlign: "center", padding: 60 }}>
          Este navegador não conseguiu tocar o vídeo na prévia. Use Chrome ou Edge atualizados; a exportação não é afetada.
        </AbsoluteFill>
      ) : null}
      {s.segments.map((seg, i) => {
        const len = segFrames(seg);
        const startAt = from;
        from += len;
        const vol = s.volume;
        return (
          <Sequence key={`${i}-${seg.start}`} from={startAt} durationInFrames={len} premountFor={FPS} name={`trecho ${i + 1}`}>
            {/* Camada de fundo desfocada (apenas quando bgMode === 'blur') */}
            {effectiveBgMode === "blur" && (
              <OffthreadVideo
                src={src}
                trimBefore={Math.round(seg.start * FPS)}
                volume={() => 0} // SEMPRE MUDO
                style={{
                  position: "absolute",
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
            )}

            {/* Vídeo principal nítido */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `translate(${panX}%, ${panY}%) scale(${scale})`,
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
    </AbsoluteFill>
  );
};
```

### 3. `src/editor/VideoPanel.tsx`
Inserir a seção de controles na coluna lateral da cena:
- Adicionar botões para seleção de `bgMode` (`"blur"` | `"cover"` | `"contain"` | `"black"`).
- Sliders:
  - `Pan X`: de `-50%` a `+50%` (passo `1%`).
  - `Escala (Zoom)`: de `80%` a `200%` (passo `5%`).
  - `Desfoque de Fundo`: de `10px` a `50px` (passo `2px`).
- Botão "Resetar enquadramento".

### 4. `src/editor/App.tsx` & `src/editor/styles.css`
- Adicionar o botão no header do player:
  ```tsx
  <button
    className={`btn tiny ${showSafeZones ? "active" : "ghost"}`}
    onClick={() => setShowSafeZones(!showSafeZones)}
    title="Exibir margens e botões de interface do TikTok e Instagram Reels"
  >
    🛡️ Safe Zones
  </button>
  ```
- Renderizar dentro de `.player-frame`:
  ```tsx
  {showSafeZones && project.format === "portrait" && <SafeZonesOverlay />}
  ```
- Criar o componente SVG/CSS `<SafeZonesOverlay />` com marcações visuais translúcidas de botões laterais (coração, balão, compartilhar), área de texto inferior e retângulo central seguro pontilhado.

---

## 🔍 Checklist de Auditoria e Verificação

Execute os seguintes comandos e passos antes de liberar para a Fase 2:

1. **Checagem estática de tipos**:
   ```bash
   npm run typecheck
   ```
   *Critério: Zero erros do compilador TypeScript.*

2. **Teste de Áudio e Renderização**:
   - Importe ou selecione um vídeo gravado horizontal 16:9 em um projeto configurado em formato `Vertical 9:16 (1080×1920)`.
   - Verifique que o fundo desfocado aparece preenchendo a tela inteira.
   - Ouça a reprodução no player: o áudio não pode apresentar eco, sobreposição ou estalos.

3. **Teste de Enquadramento (Pan X & Scale)**:
   - Arraste o slider de Pan X para centralizar o locutor. Verifique se o ajuste é instantâneo e suave no player.
   - Alterne para o modo `Preencher (Cover)` e verifique se o vídeo faz o crop 9:16 correto.

4. **Teste de Safe Zones**:
   - Clique em `[🛡️ Safe Zones]` no topo do player.
   - Verifique se as zonas cegas laterais e inferiores ficam nítidas sobre o vídeo, permitindo posicionar títulos e legendas com precisão fora do alcance dos botões nativos do TikTok e Instagram.
