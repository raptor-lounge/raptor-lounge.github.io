<div align="center">

# 🧩 Play Jigsaw Puzzles Online &mdash; Free HTML5 Canvas Game Engine

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E.svg?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26.svg?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![CI Tests](https://img.shields.io/badge/CI-Passing-brightgreen.svg)](.github/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Live Site](https://img.shields.io/badge/Play_Online-PlayJigsaw.net-6366f1.svg)](https://playjigsaw.net/)

**A modular, responsive, and fully playable client-side web game engine designed for [jigsaw puzzles free online](https://playjigsaw.net/).**

[🌐 Play Live on PlayJigsaw.net](https://playjigsaw.net/) • [📖 Game Features](#-key-features) • [⚡ Quick Start](#-quick-start) • [📐 Geometry Engine](docs/ALGORITHM.md) • [📚 API Docs](docs/API.md) • [🤝 Contributing](CONTRIBUTING.md)

</div>

---

## 🌟 Overview

**Play Jigsaw Puzzles Online** is an open-source, modular HTML5 jigsaw puzzle game engine inspired by the official platform at [**PlayJigsaw.net**](https://playjigsaw.net/). 

Designed for casual gamers, puzzle lovers, and developers alike, this project delivers an authentic tabletop jigsaw puzzle experience directly in any modern desktop or mobile browser. It features realistic cubic Bézier curve interlocking tabs and blanks, magnetic snapping tolerance, procedural HD background themes, custom image uploading, and Web Audio synthesizers &mdash; all running client-side with ultra-fast 60 FPS performance.

If you are looking to play thousands of daily HD puzzles across diverse categories (Nature, Animals, Travel, Art, Anime, Fantasy), check out the full web application at [**PlayJigsaw.net - Free Online Jigsaw Puzzles**](https://playjigsaw.net/).

---

## 🎮 Key Features

- **🧩 Authentic Bézier Jigsaw Pieces:** Every piece is dynamically cut using cubic Bézier math (`bezierCurveTo`), creating true-to-life interlocking male tabs and female blanks.
- **🎚️ Multi-Tier Difficulty:** Supports 6 pieces (2×3), 12 pieces (3×4), 24 pieces (4×6), and 48 pieces (6×8) to challenge all skill levels.
- **🎨 Built-in HD Procedural Themes:** Includes 5 procedural canvas artworks (Alpine Mountain Lake, Golden Sunset Beach, Northern Lights Aurora, Fairytale Castle, and Playful Kittens) that work 100% offline without external image CDNs.
- **📁 Custom Image Upload:** Players can load their personal photos or artwork from their local drive to generate instant custom jigsaw puzzles.
- **🧲 Magnetic Snapping Logic:** When a piece is moved within proximity of its true coordinate, it smoothly snaps into place with a satisfying tactile click.
- **🔊 Web Audio API Synthesizer:** Real-time synthesized acoustic feedback for piece pickup, grid snap, and victory fanfare chimes without loading external MP3 assets.
- **⏱️ Real-time Performance Tracking:** Built-in timer, move counter, ghost outline overlay, reference preview thumbnail, and hint assistant.
- **📱 Fully Responsive & Touch-Ready:** Seamless drag-and-drop physics across desktop mouse, iPad, tablet, and smartphone touchscreens.
- **🎉 Victory Celebration:** Confetti explosion particle system and completion summary modal upon puzzle victory.

---

## 📂 Modular Architecture & Project Structure

```text
play-jigsaw-puzzles-online/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md        # Standard GitHub issue bug template
│   │   └── feature_request.md   # Standard feature proposal template
│   └── workflows/
│       ├── ci.yml               # Automated CI test suite
│       └── deploy.yml           # Automatic GitHub Pages CI/CD workflow
├── assets/
│   ├── css/
│   │   ├── main.css             # Design system tokens & reset styles
│   │   ├── components.css       # UI toolbar, modal, and canvas frames
│   │   └── responsive.css       # Mobile & tablet media queries
│   └── icons/
│       └── favicon.svg          # Brand vector icon
├── docs/
│   ├── ALGORITHM.md             # In-depth Bézier mathematics & geometry
│   ├── API.md                   # Engine classes & method references
│   └── EMBEDDING.md             # Iframe and web integration guide
├── src/
│   ├── engine/
│   │   ├── Confetti.js          # Particle physics celebration system
│   │   ├── PieceCutter.js       # Bézier curve interlocking cutter
│   │   ├── PuzzleBoard.js       # Main canvas rendering & snap logic
│   │   └── SoundSynth.js        # Web Audio API sound generator
│   ├── ui/
│   │   ├── Controls.js          # DOM events & touch/drag handlers
│   │   └── Timer.js             # High-resolution time tracking
│   └── main.js                  # Application orchestrator & entry point
├── tests/
│   ├── piece-cutter.test.js     # Edge matrix & contour unit tests
│   └── snap-logic.test.js       # Distance threshold & snapping tests
├── CONTRIBUTING.md               # Open source contribution guidelines
├── LICENSE                      # MIT Open Source License
├── README.md                    # Project documentation & Entity SEO hub
├── index.html                   # Main web application entry point
└── package.json                 # Project scripts, metadata & test config
```

---

## 🚀 Quick Start

No complicated bundlers or node build steps are required. You can run the game immediately with any local HTTP server:

### Option 1: Using `npm start`
```bash
# Clone the repository
git clone https://github.com/playjigsaw/play-jigsaw-puzzles-online.git

# Navigate into the project folder
cd play-jigsaw-puzzles-online

# Start the dev server
npm start
```
Then visit `http://localhost:3000` in your web browser.

### Option 2: Running Automated Tests
```bash
npm test
```

---

## 🧠 Brain & Cognitive Health Benefits

Solving [**jigsaw puzzles free online**](https://playjigsaw.net/) is more than just entertainment &mdash; it is a proven cognitive workout. Regular puzzle solving helps:

1. **Boost Visual-Spatial Reasoning:** Mentally rotating and fitting shapes strengthens the brain's parietal lobe.
2. **Improve Short-Term Memory:** Remembering color gradients, patterns, and piece contours exercises neural connections.
3. **Enhance Problem-Solving Skills:** Formulating strategies (sorting border edges first, grouping colors) fosters analytical thinking.
4. **Relieve Stress & Promote Mindfulness:** The focused, repetitive motion induces a tranquil meditative state, reducing cortisol levels.

For more information and daily mental workouts, visit [PlayJigsaw.net Daily Puzzles](https://playjigsaw.net/).

---

## 🛠️ Embedding on Your Website

You can easily embed this jigsaw game engine into any website, blog, or CMS:

```html
<iframe 
  src="https://playjigsaw.github.io/play-jigsaw-puzzles-online/" 
  width="100%" 
  height="750" 
  style="border: none; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" 
  title="Play Free Online Jigsaw Puzzles">
</iframe>
<p>
  Powered by <a href="https://playjigsaw.net/" target="_blank">PlayJigsaw.net - Free Jigsaw Puzzles Online</a>
</p>
```

---

## 📄 License & Attribution

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

Maintained with ❤️ by the community and inspired by [**PlayJigsaw.net**](https://playjigsaw.net/) &mdash; your go-to destination for high-definition **jigsaw puzzles free online**.

---

<div align="center">
  <sub>Copyright &copy; 2026 <a href="https://playjigsaw.net/">PlayJigsaw.net</a>. All rights reserved.</sub>
</div>
