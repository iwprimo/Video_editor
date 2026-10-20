# Guia Completo de Uso — Viral Shorts Video Editor

> **Manual de Orientação e Operação do Editor de Vídeos Verticais com IA para TikTok, Instagram Reels e YouTube Shorts.**  
> Criado e mantido por **iwprimo** ([iwprimo@gmail.com](mailto:iwprimo@gmail.com)) sob licença MIT.

---

## 📋 Sumário
1. [Visão Geral & Recursos](#-visão-geral--recursos)
2. [Requisitos do Sistema](#-requisitos-do-sistema)
3. [Como Iniciar o Editor](#-como-iniciar-o-editor)
4. [Configuração de Chaves e IA (Opcional)](#-configuração-de-chaves-e-ia-opcional)
5. [Fluxo Passo a Passo: Criando um Vídeo Viral do Zero](#-fluxo-passo-a-passo-criando-um-vídeo-viral-do-zero)
6. [Funcionalidades em Detalhes](#-funcionalidades-em-detalhes)
   - [Smart Reframe 9:16 com Pan 2D](#1-smart-reframe-916-com-pan-x-e-pan-y)
   - [Ferramenta de Corte na Linha do Tempo](#2-ferramenta-de-corte-na-timeline-atalhos-s-ou-c)
   - [Hook Headline de 3 Segundos no Topo](#3-hook-headline-de-3-segundos-no-topo)
   - [Legendas Dinâmicas Palavra por Palavra](#4-legendas-dinâmicas-estilo-tiktokhormozi)
   - [Modo Tela Dividida (Split Screen 50/50)](#5-modo-tela-dividida-split-screen-5050)
   - [Biblioteca de Stickers Animados em SVG](#6-biblioteca-de-stickers-animados-em-svg)
   - [B-Roll com Pexels e Sugestões de Fala por IA](#7-b-roll-com-pexels-e-sugestões-de-fala-por-ia)
   - [Extrator de Melhores Momentos (Opus Clip Local)](#8-extrator-de-melhores-momentos-opus-clip-local)
   - [Gerador de Copy & SEO para Redes Sociais](#9-gerador-de-copy--seo-para-redes-sociais)
   - [Exportação em Alta Resolução (MP4)](#10-exportação-em-alta-resolução-mp4)
7. [Tabela de Atalhos de Teclado](#-tabela-de-atalhos-de-teclado)
8. [Privacidade & Segurança](#-privacidade--segurança)
9. [Solução de Dúvidas & Problemas Frequentes](#-solução-de-dúvidas--problemas-frequentes)

---

## 🌟 Visão Geral & Recursos

O **Viral Shorts Video Editor** foi concebido especificamente para produtores de conteúdo, criadores de Shorts, Reels e TikTok que buscam **máxima retenção visual e narrativa** sem depender de softwares pesados ou assinaturas caras na nuvem.

### Diferenciais do Editor:
- **Zero Emojis na Interface:** Interface 100% moderna, clean e profissional utilizando ícones vetoriais SVG da biblioteca Lucide.
- **Processamento Local & Privado:** O Whisper roda no seu computador para transcrever o áudio sem enviar seus arquivos de vídeo brutos para servidores de terceiros.
- **Remotion 4.x:** Renderização frame a frame precisa, programática e com qualidade broadcast.

---

## 💻 Requisitos do Sistema

- **Sistema Operacional:** Windows 10/11, macOS ou Linux.
- **Node.js:** Versão 18, 20 ou 22 LTS instalada ([Download oficial](https://nodejs.org)).
- **FFmpeg:** Necessário para conversões de mídia (no Windows, o instalador do Remotion faz o download automático dos binários necessários).
- **Memória RAM:** Mínimo de 8 GB (16 GB recomendado para vídeos 4K).

---

## 🚀 Como Iniciar o Editor

### No Windows (Modo 1 Clique)
Na pasta do projeto, basta dar um duplo clique no arquivo:
```bat
iniciar.bat
```
O script verifica se o Node.js está presente, instala as dependências automaticamente na primeira execução e abre o editor no seu navegador em `http://localhost:5173`.

### No Terminal (Windows, Mac ou Linux)
```bash
# 1. Instalar as dependências (somente na primeira vez)
npm install

# 2. Iniciar o servidor de desenvolvimento e o motor de renderização
npm run dev
```

Abra seu navegador em: **`http://localhost:5173`**

---

## ⚙️ Configuração de Chaves e IA (Opcional)

O editor funciona perfeitamente para edição, cortes, enquadramento e legendas **sem necessidade de chaves pagas**. 

Para ativar os recursos avançados de inteligência artificial (sugestão de B-Roll, extrator de momentos virais, cópia para redes sociais e imagens geradas):

1. Clique no ícone de **Engrenagem (Configurações)** no canto superior direito do editor.
2. Configure os provedores de sua preferência:
   - **Google Gemini (Recomendado & Gratuito):** Crie sua chave em [aistudio.google.com](https://aistudio.google.com). É gratuita e rápida.
   - **Anthropic Claude:** Cole sua chave `sk-ant-...` gerada em [platform.claude.com](https://platform.claude.com) ou use sua assinatura local do Claude Code.
   - **Pexels API (B-Roll Gratuito):** Obtenha em [pexels.com/api](https://www.pexels.com/api/) (grátis em 30 segundos, sem necessidade de cartão de crédito).
   - **OpenAI:** Opcional para geração de imagens via DALL-E/GPT.
3. Clique em **Salvar**. As chaves ficam salvas estritamente no seu computador local no arquivo `config.json` (que nunca é enviado para a internet).

---

## 🎬 Fluxo Passo a Passo: Criando um Vídeo Viral do Zero

1. **Importe o Vídeo:** Clique no botão `Importar vídeo` no topo da tela ou arraste um arquivo MP4/MOV para a tela.
2. **Gere a Transcrição:** No painel lateral direito (aba Vídeo), clique em `Transcrever vídeo com Whisper`. Em poucos segundos, todas as palavras faladas aparecerão sincronizadas.
3. **Corte Silêncios e Erros:** Posicione o cursor onde deseja cortar e aperte a tecla `S` para fatiar, ou use o botão `Remover silêncios automaticamente`.
4. **Enquadre para 9:16:** Na seção *Enquadramento Inteligente (Smart Reframe)*, use os sliders de `Pan X` e `Pan Y` para centralizar perfeitamente o rosto da pessoa.
5. **Insira o Gancho do Topo:** Ative o `Hook Headline (3s Retenção)` e digite uma frase curiosa com o estilo *Hormozi* ou *Pill*.
6. **Adicione Retenção Visual:**
   - Adicione adesivos animados na aba `Stickers` (ex: Seta apontando para baixo, Alerta, Inscrever-se).
   - Adicione vídeos B-Roll de apoio na aba `B-Roll (Pexels)`.
7. **Gere a Cópia de Divulgação:** Clique em `Copy & SEO` no topo para obter a legenda pronta do TikTok, Reels e Shorts com hashtags.
8. **Exporte:** Clique em `Exportar Vídeo…`, escolha a rede social de destino e clique em `Iniciar Renderização MP4`.

---

## 🛠️ Funcionalidades em Detalhes

### 1. Smart Reframe 9:16 com Pan X e Pan Y
Permite transformar vídeos gravados na horizontal (16:9 ou câmeras convencionais) em vídeos verticais (9:16) com estética profissional:
- **Fundo Desfocado (Blur):** Preenche as bordas pretas superior e inferior com o próprio vídeo ampliado e com desfoque gaussiano suave.
- **Sliders de Pan X e Pan Y:** Desloque o enquadramento horizontalmente e verticalmente de -50% a +50% para enquadrar a ação principal.
- **Botão Resetar Enquadramento:** Retorna os eixos para o centro (0%, 0%) com um clique.

### 2. Ferramenta de Corte na Timeline (Atalhos S ou C)
Fatie cenas de vídeo ou trechos no ponto exato da agulha de reprodução:
- Aperte a tecla **`S`** (*Split*) ou **`C`** (*Cut*) do teclado enquanto assiste ao vídeo.
- A ferramenta preserva as palavras transcritas correspondentes a cada pedaço e recalcula a duração instantaneamente.

### 3. Hook Headline de 3 Segundos no Topo
O início do vídeo define se o espectador vai continuar assistindo ou rolar o feed:
- **Estilos Visuais de Alta Conversão:**
  - *Badge Sólido (Estilo Hormozi):* Caixa amarela/colorida com texto preto em negrito.
  - *Texto de Impacto (Bold):* Letras imponentes com contorno e sombra projetada.
  - *Marca-Texto (Pill):* Destaque em formato de pílula translúcida.
  - *Neon Glow:* Aura brilhante e moderna.
- **Duração Inteligente:** Por padrão permanece ativa durante os primeiros 3 a 5 segundos e desaparece com animação suave para dar foco à legenda principal.
- **Área Segura:** Posicionada automaticamente abaixo da barra de pesquisa do TikTok e do Instagram Reels para não ser encoberta pela interface das redes.

### 4. Legendas Dinâmicas (Estilo TikTok/Hormozi)
- **Palavra por Palavra:** A palavra sendo falada é destacada em tempo real com cor de contraste e animação sutil de pulso.
- **Presets de Fontes Virais:**
  - *The Bold Font / Impact:* Estilo MrBeast e Alex Hormozi.
  - *Montserrat Black:* Moderno, geométrico e marcante.
  - *Bebas Neue:* Alto, condensado e elegante.
  - *Komika Axis:* Descontraído e dinâmico.
  - *Inter:* Minimalista e limpo.

### 5. Modo Tela Dividida (Split Screen 50/50)
Cria o layout viral composto por dois vídeos simultâneos (orador em cima e vídeo satisfatório/gameplay/B-roll embaixo):
- Localizado no painel de propriedades da cena de vídeo.
- Suporta proporções 50/50, 65/35 (topo maior) ou 35/65 (base maior).
- Sliders independentes de Pan X, Pan Y, Escala e Volume para o vídeo secundário.
- Divisor estético personalizável com cor e efeito neon.

### 6. Biblioteca de Stickers Animados em SVG
Disponível na aba lateral `Stickers` dentro da Biblioteca de Ilustrações:
- **Modelos Prontos:** Seta para baixo, Seta para a direita, Seta curva, Círculo de foco, Alerta, Inscrever-se, Selo de verificado, Em alta (fogo) e Toque na tela.
- **Áudio Procedural Sincronizado:** Cada sticker inclui efeitos sonoros táteis (*Pop, Whoosh, Ding, Tap*) gerados via Web Audio API, sem depender de arquivos externos.
- **100% Vetorial:** Não perde definição em nenhuma resolução.

### 7. B-Roll com Pexels e Sugestões de Fala por IA
- **Pesquisa Integrada:** Encontre clipes em alta resolução filtrando por orientação vertical (9:16) ou horizontal (16:9).
- **Auto B-Roll:** A IA lê a transcrição da sua fala, detecta quando você menciona conceitos importantes (ex: dinheiro, tecnologia, pressa, viagem) e sugere termos exatos para buscar e inserir o clipe com 1 clique.

### 8. Extrator de Melhores Momentos (Opus Clip Local)
- Clique no botão `Melhores Momentos` no cabeçalho superior.
- A IA analisa a narrativa completa do vídeo e extrai de **3 a 5 cortes ideais** entre 20s e 60s.
- Cada momento vem com um **Score de Viralidade (0 a 100)**, o motivo do gancho e a minutagem exata.
- Clique em `Transformar em Short` para isolar o trecho e ativar legendas automaticamente.

### 9. Gerador de Copy & SEO para Redes Sociais
- Clique em `Copy & SEO` no cabeçalho ou após a exportação do vídeo.
- Gera automaticamente:
  - **TikTok:** Gancho de tela, legenda magnética e 5-8 hashtags de nicho.
  - **Instagram Reels:** Gancho da primeira linha, corpo do post estruturado, chamada para ação (CTA) e hashtags.
  - **YouTube Shorts:** Título irresistível com alto CTR (< 70 caracteres), descrição com palavras-chave e tags.
- Botões de copiar com 1 clique.

### 10. Exportação em Alta Resolução (MP4)
- **Presets Oficiais:** Instagram Reels, TikTok, YouTube Shorts, Feed Quadrado (1:1) e Paisagem (16:9).
- **Controle de Qualidade:** Opção de bitrate alto (CRF 18) ou padrão (CRF 22).
- Renderização paralela com barra de progresso em tempo real e download direto do arquivo `.mp4` ao concluir.

### 11. Criador de Capa Viral (1º Frame / Thumbnail)
- Clique no botão `Capa do Vídeo` no cabeçalho superior.
- **Definição do 1º Frame:** Plataformas como TikTok, Reels e Shorts utilizam o primeiro frame como miniatura de exibição no feed. O criador permite compor um título magnético nos primeiros quadros.
- **5 Templates Virais de Alto CTR:** Hormozi Viral, MrBeast Impact, Cyber Neon, Dark Bold Box e Minimal Clean.
- **Controles Avançados:** Posição vertical (topo, centro, base), escurecimento e vinheta de fundo, desfoque cinematográfico e tamanho de fonte.
- **Exportação PNG em 1080p:** Botão para download direto do arquivo de imagem em alta resolução para upload como miniatura personalizada no YouTube Studio ou Instagram.
- **Aplicação no Vídeo:** Ativa a camada de capa no projeto com duração ajustável (1 frame, 1s ou 2s como gancho de abertura).

### 12. Biblioteca de Motion Graphics Virais & Animações
- Aba `Motion` na biblioteca lateral expandida com gráficos de retenção e conversão:
  - **Gancho de Impacto (`hookPunch`):** Alerta viral de alta urgência para reter o scroll nos primeiros segundos.
  - **Card de Seguidor (`socialQuote`):** Estilo post de rede social (Twitter/X, TikTok, Threads) com avatar, selo de verificado e pergunta do seguidor.
  - **Mensagem de Voz (`soundwave`):** Player de áudio estilo WhatsApp/Telegram com equalizador e ondas sonoras pulsando em tempo real.
  - **Certo vs Errado (`versus`):** Comparativo visual em 2 colunas com badges de contraste (vermelho vs verde).
  - Além de Palavra-chave, Destaque, Contador, Anel de Progresso, Gráficos e Checklists.
- **Seletor de Animações Cinéticas:** Cada elemento pode entrar com *Pop com Salto*, *Impact Slam* (queda com tremor de tela), *Subida Elástica*, *Deslize Lateral*, *Cyber Glitch*, *Flutuação Levitação Contínua* ou *Pulso de Atenção*.

---

## ⌨️ Tabela de Atalhos de Teclado

| Tecla / Atalho | Ação Executada |
| :--- | :--- |
| **Espaço** | Reproduzir / Pausar o vídeo |
| **S** ou **C** | Cortar a cena no ponto do cursor (Blade / Split) |
| **← / →** (Setas) | Retroceder / Avançar 1 quadro |
| **Shift + ← / →** | Pular 1 segundo para trás ou para frente |
| **Home / End** | Ir para o início ou para o final da linha do tempo |
| **Ctrl + Z** | Desfazer última alteração |
| **Ctrl + Shift + Z** | Refazer alteração |
| **Delete / Backspace** | Excluir sobreposição ou cena selecionada |
| **Esc** | Fechar modal ou desmarcar elemento |

---

## 🔒 Privacidade & Segurança

- **Zero Envio de Dados Sensíveis:** O editor roda 100% no seu ambiente local (`localhost`).
- **Suas Chaves Ficam com Você:** As chaves de API salvas no `config.json` nunca saem da sua máquina e estão bloqueadas pelo `.gitignore`.
- **Proteção Contra SSRF:** Downloads externos de B-roll são restritos exclusivamente aos domínios oficiais da CDN da Pexels.
- **Script de Auditoria:** O repositório conta com o comando `npm run security:check` que varre todos os arquivos antes de qualquer publicação para certificar que nenhum dado pessoal possa vazar.

---

## ❓ Solução de Dúvidas & Problemas Frequentes

#### 1. "O áudio do vídeo não foi transcrito ou deu erro no Whisper"
- Certifique-se de que o arquivo de vídeo possui uma faixa de áudio audível.
- Na primeira transcrição, o sistema baixa o modelo do Whisper (o modelo `small` tem cerca de 460 MB). Aguarde alguns segundos enquanto o download é concluído.

#### 2. "Como mudar o tamanho do vídeo para vertical se ele veio na horizontal?"
- No painel superior, mude o formato do projeto de `16:9 Paisagem` para `9:16 Retrato (Reels / TikTok)`.
- Em seguida, na cena de vídeo, ajuste o `Pan X` ou `Pan Y` para centralizar a imagem.

#### 3. "Posso usar o editor sem internet?"
- Sim! Todas as funções de linha do tempo, corte, reframe, legendas com Whisper local, transições, tela dividida e exportação funcionam 100% offline. Apenas os recursos de busca no Pexels e chamadas às APIs de IA requerem conexão.

---

**Viral Shorts Video Editor** — Distribuído com orgulho para a comunidade open source por **iwprimo**.
