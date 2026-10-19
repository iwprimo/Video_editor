# Editor de Vídeo (Remotion)

Editor visual para montar vídeos: cenas prontas (título, gráfico, números, frase, encerramento) e **vídeos gravados**, com cortes, remoção de silêncios, legendas automáticas, ilustrações e motion design, efeitos, transições, **edição por prompt** e exportação em MP4.

## Requisitos

- **Node.js 22 LTS** ou mais novo — https://nodejs.org
- **Chrome ou Edge** atualizado para usar o editor (a prévia de vídeo precisa do suporte a H.264)
- Internet na primeira execução (instala as dependências e baixa o navegador que o Remotion usa para renderizar)
- Opcional, configuradas na engrenagem do editor:
  - chave da **API da Claude** (edição por prompt)
  - chave da **API do Gemini** para gerar imagens com o **Nano Banana 2** (gerador padrão)
  - chave da **API da OpenAI** para gerar imagens com o GPT Image

## Como abrir

**Windows:** dê dois cliques em `iniciar.bat`.
Na primeira vez ele instala tudo; depois abre o editor no navegador em `http://localhost:5173`.

**Terminal (qualquer sistema):**

```bash
npm install
npm run dev
```

Para encerrar, feche a janela do terminal.

## Vídeo gravado

1. **Importar vídeo** (barra de cima), **+ Cena › Vídeo gravado…** ou arraste o arquivo para a janela
   - Aceita MP4, MOV (inclusive HEVC de iPhone), MKV, WebM; o que o navegador não toca é convertido automaticamente para H.264
2. Com a cena de vídeo selecionada, o painel da direita mostra:
   - **Remover silêncios**: ajuste o limite, a pausa mínima e o respiro, clique em *Encontrar pausas* e depois em *Cortar pausas*
   - **Transcrição**: *Transcrever fala* roda o Whisper no seu computador (o vídeo não sai da máquina). Depois:
     - **modo Palavras**: clique numa palavra para ir até ela; **arraste** ou **Shift+clique** para selecionar um trecho; **Delete** ou **Cortar trecho** remove a fala do vídeo
     - setas ← → andam pelas palavras (com Shift, ampliam a seleção); **Esc** limpa a seleção
     - **duplo clique** ou **Enter** corrige uma palavra; **Tab** salva e passa para a próxima. Digitar duas palavras divide a palavra; apagar tudo tira a palavra da legenda
     - palavras cortadas aparecem riscadas; selecione e use **Restaurar trecho** para devolver
     - **modo Texto**: edita a transcrição inteira como um texto comum; ao aplicar, cada palavra mantém o seu tempo (**Ctrl+Enter** aplica)
     - **lupa**: localizar e substituir em toda a transcrição
     - **Corrigir com IA**: o Claude revisa palavras mal reconhecidas, acentos, pontuação e nomes, sem mudar o que foi dito. Informe termos e nomes (ex.: *aldosterona, Klabin, MP9*) para ele usar a grafia certa. Você marca o que aceitar antes de aplicar; usa a sua assinatura ou a chave de API, conforme a engrenagem
     - a caixa da transcrição pode ser esticada pela alça no canto inferior direito
   - **Legendas**: liga/desliga e escolhe o estilo pelas prévias (passe o mouse para ver a animação). Cor, tamanho, posição e palavras por vez ficam na aba Projeto

**Estilos de legenda:** Marca-texto (fundo colorido na palavra falada, o mais comum em Reels e TikTok), Impacto (caixa alta grossa com contorno), Duas cores, Pulo, Subida suave, Neon, Faixa colorida, Máquina de escrever, Karaokê, Pop (uma palavra por vez), Caixa escura, Contorno fino e Simples. Ao escolher um estilo, o editor ajusta as palavras por vez e a caixa alta que combinam com ele.
3. Os cortes não estragam o arquivo original: dá para restaurar tudo a qualquer momento

**Transcrição na primeira vez:** o editor baixa o whisper.cpp e o modelo escolhido (padrão *small*, 466 MB). Se a rede da empresa bloquear `huggingface.co`, baixe `ggml-small.bin` em https://huggingface.co/ggerganov/whisper.cpp usando outra rede e coloque em `whisper/modelos/`. No Windows, se a transcrição falhar logo no início, instale o *Microsoft Visual C++ Redistributable*.

## Ilustrações e motion design

Na biblioteca (esquerda), seção **Ilustrações**:

- **Motion**: nome e cargo, destaque, palavra-chave, contador, gráfico, anel de progresso, lista com check, chamada
- **Ícones**: 1.800+ ícones Lucide; a busca entende português (*fábrica*, *segurança*, *meta*, *tempo*…)
- **Imagens**: envie fotos, logos e prints (PNG transparente funciona bem para logos)
- **Gerar com IA**: escolha o gerador — **Nano Banana** (Google Gemini) ou **GPT Image** (OpenAI) —, descreva a ilustração e ela é criada e inserida no ponto do cursor (tem custo por imagem)

### Nano Banana 2 (Google Gemini)

1. Crie a chave em https://aistudio.google.com › *Get API key*. A geração de imagens exige faturamento ativo no projeto do Google Cloud ligado à chave
2. No editor, engrenagem › *Nano Banana (Google Gemini)*: cole a chave e salve
3. Opções:
   - **Modelo**: Nano Banana 2 (`gemini-3.1-flash-image`, padrão), Nano Banana 2.1 (mais recente), Nano Banana Pro (mais detalhe, mais caro) e Nano Banana 2 Lite (mais barato, só 1K)
   - **Resolução**: 1K (rápida), 2K ou 4K
   - **Gerador padrão**: qual dos dois a edição por prompt usa; se o padrão não tiver chave, o editor usa o outro
4. O Gemini não gera fundo transparente: com *Fundo liso* marcado, a imagem vem sobre fundo branco. Para logos com transparência, use o GPT Image ou envie o PNG pronto
5. Toda imagem do Gemini leva a marca d’água invisível SynthID

Em rede corporativa com proxy próprio para o Google, dá para apontar outro endereço com a variável `GEMINI_API_BASE`.

Clique para inserir no ponto do cursor, ou arraste até a faixa amarela de ilustrações na linha do tempo. Na faixa, arraste o bloco para mudar o momento (ele acompanha a fala, mesmo depois de novos cortes) e a borda direita para mudar a duração. Selecionada, a ilustração mostra no painel da direita o texto, os números, a posição (grade 3×3) e o tamanho.

## Edição por prompt

A barra abaixo da prévia recebe pedidos em português, por exemplo:

- “remova os silêncios e as pausas longas”
- “corte a parte em que falo do almoço”
- “coloque meu nome e cargo no começo: Ivan, líder de produção”
- “mostre um contador quando eu falar da eficiência”
- “legendas amarelas em caixa alta, uma palavra por vez”
- “gere uma ilustração de uma bobina de papel quando eu falar da máquina” (usa o gerador padrão: Nano Banana, se houver chave do Gemini)

A Claude lê a transcrição, as cenas e as ilustrações, e devolve as mudanças; tudo vira **um único passo**: um *Desfazer* reverte o pedido inteiro. “Aqui” e “agora” significam a posição do cursor. O histórico mostra pedidos, respostas e o que foi ignorado. Cada pedido tem um custo pequeno na sua conta da Anthropic (o modelo padrão é o Claude Sonnet 5.5; dá para trocar na engrenagem).

## Como usar

**Ajustar a tela:** arraste a borda das barras laterais para mudar a largura, e a borda de cima da linha do tempo para mudar a altura. Duplo clique na borda volta ao tamanho padrão. O editor lembra o tamanho escolhido.

**Linha do tempo (embaixo)**

- Clique numa cena para selecionar e editar
- Arraste a cena para os lados para mudar a ordem
- Arraste a borda direita da cena para mudar a duração (ajusta de 0,5 em 0,5 s; segure **Alt** para ajuste fino)
- Clique ou arraste na régua para navegar no vídeo
- **+ Cena** adiciona depois da cena selecionada; **Duplicar** e **Excluir** agem sobre a selecionada

**Biblioteca de efeitos (esquerda)**

- Quatro grupos: **Transições**, **Câmera**, **Cor** e **Sobreposição** — ou use a busca
- Passe o mouse sobre um efeito para ver a prévia no vídeo, sem alterar nada
- Clique para aplicar na cena selecionada, ou arraste o efeito até um bloco da linha do tempo
- Transições ligam a cena à **próxima** (por isso não valem na última cena); aparecem como um losango entre os blocos
- Efeitos de cor e sobreposição têm o botão **Vídeo todo**, que aplica no vídeo inteiro
- A intensidade de cada efeito e o tipo, direção e duração da transição se ajustam no painel da direita

| Grupo | Efeitos |
| --- | --- |
| Transições | Corte seco, Dissolver, Empurrar, Cortina, Virar, Relógio, Íris, Corte com zoom |
| Câmera | Zoom lento, Afastar, Deslizar, Câmera na mão, Impacto, Foco de entrada |
| Cor | Preto e branco, Vintage, Cinema, Cores vivas |
| Sobreposição | Vinheta, Granulado, Linhas de TV, Vazamento de luz, Barras de cinema, Flash, Glitch |

As transições usam a biblioteca oficial `@remotion/transitions`. Granulado, Vazamento de luz e Cinema são os efeitos mais pesados para exportar; se a exportação ficar lenta, reduza o uso deles.

**Painel da direita**

- Aba **Cena**: textos, números, duração, efeitos e transição da cena selecionada
- Na cena de gráfico, **Colar do Excel** aceita duas colunas copiadas (rótulo e valor)
- Aba **Projeto**: nome, formato (horizontal, vertical ou quadrado), efeitos do vídeo inteiro, temas prontos e cores

**Barra de cima**

- **Salvar** baixa o projeto como `.json`; **Abrir** carrega um `.json` salvo
- O projeto atual também fica salvo automaticamente no navegador
- **Exportar MP4** renderiza o vídeo; o arquivo fica na pasta `exportados/` e também pode ser baixado pelo botão

## Atalhos

| Tecla | Ação |
| --- | --- |
| Espaço | Reproduzir / pausar |
| ← / → | Voltar / avançar 1 quadro (com Shift: 1 segundo) |
| Ctrl+Z | Desfazer |
| Ctrl+Shift+Z ou Ctrl+Y | Refazer |
| Ctrl+D | Duplicar cena |
| Delete | Excluir cena |

## Estrutura

```
src/remotion/types.ts     modelo de dados, cortes e mapeamento de tempo
src/remotion/Video.tsx    cenas (inclusive vídeo gravado com cortes)
src/remotion/effects.tsx  efeitos de câmera, cor e sobreposição + transições
src/remotion/overlays.tsx ilustrações, motion design e legendas
src/remotion/Root.tsx     registro da composição (duração e tamanho vêm do projeto)
src/editor/               interface do editor (React + Remotion Player)
src/editor/ops.ts         aplica as mudanças vindas da edição por prompt
server/index.mjs          servidor local: exportação, mídia, transcrição, prompt, imagens
server/media.mjs          conversão, silêncios e áudio (ffmpeg que vem com o Remotion)
server/whisper.mjs        transcrição local (whisper.cpp)
server/ai.mjs             Claude (prompt) e geração de imagens: Gemini/Nano Banana e OpenAI
midia/                    vídeos e imagens importados
exportados/               vídeos exportados
config.json               chaves e modelos (criado ao salvar as configurações)
```

**Projetos salvos** (`.json`) guardam referências aos arquivos em `midia/`. Para levar um projeto para outro computador, copie também a pasta `midia/`.

O editor e a exportação usam a **mesma** composição, então o MP4 sai igual à prévia.

### Criar um novo tipo de cena

1. Em `types.ts`: adicione o tipo em `Scene`, o nome em `SCENE_LABELS` e o padrão em `makeScene`
2. Em `Video.tsx`: crie o componente da cena e inclua no `switch` de `SceneView`
3. Em `Inspector.tsx`: inclua os campos no `switch` de `SceneFields`
4. Em `styles.css`: dê uma cor ao bloco da linha do tempo (`--t-<tipo>` e `.t-<tipo>`)

### Criar um novo efeito

1. Em `types.ts`: adicione o nome em `EffectType` e a descrição em `EFFECTS`
2. Em `effects.tsx`: implemente dentro de `EffectsLayer` (câmera e cor no `switch`; sobreposições no `effects.map`)
3. Em `styles.css`: crie a miniatura animada com a classe `.fx-<nome>`

## Outros comandos

- `npm run studio` — abre o Remotion Studio com a composição
- `npm run typecheck` — verifica os tipos

## Problemas comuns

- **"O servidor de exportação não respondeu"**: o editor foi aberto sem o servidor. Use `iniciar.bat` ou `npm run dev`, que sobem os dois juntos.
- **Rede da empresa bloqueia o download do navegador**: aponte para um Chrome já instalado antes de iniciar, por exemplo no Windows:
  `set REMOTION_BROWSER_EXECUTABLE=C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Rede da empresa com proxy**: se downloads (Whisper, modelos) ou as APIs falharem com "fetch failed", rode antes `set NODE_USE_ENV_PROXY=1` (com `HTTPS_PROXY` já configurado) e inicie de novo.
- **"Este navegador não conseguiu tocar o vídeo na prévia"**: use Chrome ou Edge atualizados. A exportação não é afetada.
- **Exportação lenta**: vídeos longos com muitas ilustrações e efeitos pesados (granulado, vazamento de luz, cinema) demoram mais. A exportação roda no processador; deixe o editor aberto até terminar.

## Licença do Remotion

O Remotion é gratuito para uso pessoal e para empresas com até 3 pessoas. Uso corporativo em empresas maiores exige licença: https://www.remotion.pro/license
