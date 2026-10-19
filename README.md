# Viral Shorts Video Editor

> **Open-Source AI & Timeline Video Editor designed specifically for TikTok, Instagram Reels, and YouTube Shorts.**

Developed and maintained by **iwprimo** ([iwprimo@gmail.com](mailto:iwprimo@gmail.com)) under the **MIT License**.

---

## 🌟 Highlights & Capabilities

- **Smart 9:16 Reframe with 2D Pan:**
  - Automatic blurry background for landscape videos.
  - Horizontal (`Pan X`: -50% to +50%) and Vertical (`Pan Y`: -50% to +50%) positioning to perfectly center faces and subjects in 9:16 portrait.
  - Quick Reset button.

- **Timeline Blade / Split Tool:**
  - Slice scenes and video segments precisely at the playhead position with 1 click or keyboard shortcuts `S` or `C`.
  - Seamless timeline navigation, frame-accurate preview with Remotion Player.

- **Viral Top Headline Hook (3s Retenção):**
  - Configurable top headline designed to capture viewers in the critical first 3 seconds.
  - Four high-engagement visual styles: `Badge Sólido (Hormozi)`, `Texto de Impacto (Bold)`, `Marca-Texto (Pill)`, `Neon Glow (Aura)`.
  - Spring entrance physics and smooth exit transitions.
  - Strict compliance with TikTok and Instagram Reels safe zones.

- **Viral Typography Presets:**
  - Choose between industry-standard viral fonts:
    - *The Bold Font* (MrBeast / Alex Hormozi style)
    - *Montserrat Black* (Modern & punchy)
    - *Bebas Neue* (Tall & elegant)
    - *Impact* (Classic high-contrast)
    - *Komika Axis* (Dynamic comic style)
    - *Inter* (Clean & minimalist)
  - Applied instantly to dynamic captions and top headlines.

- **Dynamic Word-by-Word Captions:**
  - Whisper-powered transcription.
  - Word-level highlighting with customizable active/inactive colors.
  - Keyword emoji enhancements in video captions.

- **Smart Retention Features:**
  - **Dynamic Punch-in Zoom:** Alternates camera scale on cuts (1.1x to 1.5x) to maintain visual momentum.
  - **Animated Retention Progress Bar:** Real-time progress bar synced to project theme colors.
  - **Intelligent Auto-Ducking:** Automatically lowers background music volume during speech segments.
  - **Brand Kit System:** One-click application of creator presets (Hormozi, MrBeast, Minimalist, Cyberpunk, Aesthetic) and custom brand kits.

- **Clean UI & Modern SVG Icons:**
  - Strictly zero-emoji UI policy: all buttons, controls, and dialogs use clean, lightweight Lucide SVG icons.

- **Social Media Export Presets:**
  - Direct export configurations for Instagram Reels (1080x1920), TikTok (1080x1920), YouTube Shorts (1080x1920), Square Feed (1080x1080), and Landscape (1920x1080).
  - High definition CRF encoding with hardware acceleration.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [FFmpeg](https://ffmpeg.org/) installed and available in your PATH

### Installation

```bash
# Clone the repository
git clone https://github.com/iwprimo/editor-video.git
cd editor-video

# Install dependencies
npm install
```

### Running the Editor

To run both the frontend editor and the local rendering server concurrently:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Scripts

- `npm run dev`: Starts Vite dev server (port 5173) and local Express backend (port 3001).
- `npm run build`: Bundles the client application for production.
- `npm run typecheck`: Validates TypeScript types across the entire project.
- `npm run studio`: Launches the Remotion Studio preview.

---

## 🛠️ Architecture

- **Frontend:** React 19, TypeScript, Lucide Icons, Vite.
- **Video Engine:** [Remotion](https://remotion.dev/) 4.x.
- **Audio & Transcription:** Whisper.cpp, Remotion Media Utils, HTML5 Web Audio API.
- **Backend:** Node.js, Express, FFmpeg.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).  
Copyright (c) 2026 **iwprimo** (iwprimo@gmail.com).
