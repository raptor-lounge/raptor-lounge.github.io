# 🌐 Embedding Guide: Add Jigsaw Puzzles to Any Website

Easily embed the **Play Jigsaw Puzzles Online** game engine onto your own website, gaming portal, blog, or CMS (WordPress, Webflow, Wix, Squarespace).

---

## 1. Responsive iframe Embed Code

Copy and paste the following HTML snippet into your webpage:

```html
<!-- PlayJigsaw.net Interactive Jigsaw Puzzle Embed -->
<div style="position: relative; width: 100%; max-width: 1100px; margin: 0 auto; aspect-ratio: 16/10; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.35);">
  <iframe 
    src="https://playjigsaw.github.io/play-jigsaw-puzzles-online/" 
    width="100%" 
    height="100%" 
    style="border: none;" 
    allow="autoplay"
    title="Free Online Jigsaw Puzzles by PlayJigsaw.net">
  </iframe>
</div>
<p style="text-align: center; font-size: 14px; margin-top: 10px; color: #64748b;">
  Play thousands of HD daily puzzles at <a href="https://playjigsaw.net/" target="_blank" rel="noopener" style="color: #6366f1; text-decoration: none; font-weight: 600;">PlayJigsaw.net</a>
</p>
```

---

## 2. ES Module Import (For Custom Frontends)

You can also import the engine classes directly into your modern JavaScript application:

```javascript
import { JigsawApp } from './src/main.js';

const app = new JigsawApp();
app.setDifficulty(24); // Start with 24 pieces
app.loadTheme('sunset');
```

For more puzzle themes and community challenges, visit [PlayJigsaw.net](https://playjigsaw.net/).
