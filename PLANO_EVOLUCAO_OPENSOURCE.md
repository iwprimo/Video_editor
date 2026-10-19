# 🎬 PLANO DE EVOLUÇÃO & ARQUITETURA OPEN SOURCE
## Central Definitiva de Criação de Vídeos Curtos (TikTok, Instagram Reels & YouTube Shorts)

---

### 👤 Autor & Mantenedor
- **Autor / Criador:** iwprimo (`iwprimo@gmail.com`)
- **Licença:** MIT License (Open Source)
- **Tecnologias Centrais:** React 19, TypeScript, Remotion 4.x, Vite, Node.js, Express, FFmpeg, Whisper.cpp.

---

### 📐 Regras de Ouro de Interface & Design (UI Protocol)
> [!IMPORTANT]
> **REGRA MANDATÓRIA (ZERO EMOJIS NA UI):**
> Toda a interface gráfica, botões, cabeçalhos, painéis, modais e alertas devem utilizar **exclusivamente ícones vetoriais modernos em SVG** (Lucide Icons / SVG inline minimalistas).
> Emojis são permitidos apenas dentro do conteúdo gerado do vídeo (ex.: legendas dinâmicas se o usuário habilitar `autoEmoji`), **nunca** como componentes visuais da UI do editor.

---

### 🎯 Visão Geral da Fase A (Status: CONCLUÍDA & ENTREGUE)

A **Fase A** transforma o editor em uma estação de trabalho de alta precisão para criadores de conteúdo com quatro adições estratégicas de retenção, além da purificação visual completa da interface:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FASE A - 100% IMPLEMENTADA                            │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ 1. Pan Y (Eixo Y)    │ 2. Split Tool        │ 3. Headlines Virais (Top Hook)│
│ Smart Reframe com    │ Corte/Navalha manual │ Manchetes magnéticas no topo  │
│ controle vertical    │ na linha do tempo    │ para reter nos primeiros 3s   │
├──────────────────────┴──────────────────────┴───────────────────────────────┤
│ 4. Tipografia Viral (The Bold Font, Komika, Montserrat, Bebas, Impact)       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. Purificação Visual: 100% dos emojis da UI substituídos por SVGs modernos │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 📋 Detalhamento das Entregas da Fase A

#### 1. ↕️ Controle de Movimentação no Eixo Y (Pan Y)
- **Problema resolvido:** O corte 9:16 (Smart Reframe) já possui `Pan X (-50% a +50%)` para centralizar pessoas lateralmente, mas quando a pessoa está muito alta ou baixa no enquadramento, não havia como ajustar a altura.
- **Implementação:**
  - Adição do controle deslizante `Posição Vertical (Pan Y)` variando de `-50%` a `+50%` no painel `Smart Reframe` de `VideoPanel.tsx`.
  - Integração no `VideoScene` e na fórmula de transformação de `VideoView` no Remotion.
  - Botão de reset rápido para zerar Pan X e Pan Y simultaneamente.

#### 2. ✂️ Ferramenta de Corte Manual na Linha do Tempo (Blade / Split Tool)
- **Problema resolvido:** Atualmente os cortes dependem da transcrição ou da remoção automática de silêncios. O criador precisa de controle cirúrgico para fatiar cenas no ponto exato da agulha (playhead).
- **Implementação:**
  - Botão na barra de ferramentas da Timeline com ícone SVG de tesoura (`✂️` substituído por SVG moderno) e atalho de teclado `S` (Split) / `C` (Cut).
  - Função `splitSceneAtFrame(sceneId, frame)`: divide a cena de vídeo em dois trechos contíguos preservando sincronia de áudio e tempo original.
  - Permite aplicar zooms (Punch-in), efeitos ou deletar trechos específicos instantaneamente.

#### 3. 🪝 Headlines Virais de Topo (Camada de Ganchos de 3s)
- **Problema resolvido:** No TikTok e Reels, os primeiros 3 segundos decidem se o usuário fica ou passa o vídeo. Vídeos de alta retenção usam uma manchete chamativa no topo (dentro do Safe Zone).
- **Implementação:**
  - Novo módulo e camada `HeadlineLayer` em `src/remotion/HeadlineLayer.tsx`.
  - Configuração no projeto:
    - `enabled: boolean`
    - `text: string`
    - `durationSeconds: number` (ex: 3s iniciais ou vídeo todo)
    - `style: "badge" | "bold" | "highlight" | "neon"`
    - `position: "top"` (alinhado rigorosamente à Safe Zone do Reels/TikTok)
  - Animação de entrada com impacto elástico (`spring` physics).

#### 4. 🔤 Presets de Tipografia Viral
- **Problema resolvido:** Legendas e manchetes precisam do peso visual característico dos vídeos virais.
- **Implementação:**
  - Adição de presets de fontes consagradas:
    - *The Bold Font / Impact* (MrBeast / Hormozi)
    - *Komika Axis* (Estilo quadrinhos e entretenimento)
    - *Montserrat Black* (Moderno e imponente)
    - *Bebas Neue* (Condensado e elegante)
    - *Inter* (Clean e minimalista)
  - Seletor de fontes nas configurações de Legenda e Headline com prévia em tempo real.

#### 5. 🎨 Purificação Visual da UI (100% SVG Moderno)
- **Problema resolvido:** Emojis na interface criam aparência amadora e inconsistente entre diferentes sistemas operacionais (Windows, Mac, Linux).
- **Implementação:**
  - Substituição de todos os emojis em botões, abas, badges e modais por ícones vetoriais SVG da biblioteca `lucide-static` e componentes de ícone consistentes.
  - UI clean, profissional e pronta para destaque internacional no GitHub.

---

### 🗺️ Roadmap Futuro (Fases B e C)
> *Nota: Conforme diretriz do autor, o módulo de limpeza de áudio/redução de ruído foi descartado para manter foco estrito nas ferramentas de retenção visual e narrativa.*

#### Fase B: Dinâmica & Layouts de Retenção
1. **Modo Tela Dividida (Split Screen 50/50):**
   - Apresentador em cima + vídeo satisfatório/gameplay embaixo.
2. **Biblioteca de Stickers Animados em SVG:**
   - Setas de atenção, círculos de destaque e gráficos de retenção com som procedural sincronizado.

#### Fase C: Automação & Crescimento
1. **Auto B-Roll Integrado (Pexels API):**
   - Detecção de palavras-chave na fala com sugestão automática de vídeos de apoio gratuitos.
2. **Extrator de Melhores Momentos (Opus Clip Local):**
   - Análise de transcrição por IA para gerar 3 a 5 shorts cortados de vídeos longos.
3. **Gerador de Copy & SEO para Redes Sociais:**
   - Criação de texto de postagem e hashtags virais para TikTok, Instagram e YouTube.

---

### 📦 Preparação para Repositório GitHub
1. Inicialização do Git e commits estruturados a cada etapa.
2. Criação do arquivo `LICENSE` (MIT) com autoria de **iwprimo**.
3. Atualização do `README.md` com apresentação profissional do projeto para a comunidade open source.
