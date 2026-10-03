/**
 * main.js - Application Entry Point
 * Orchestrates game engine modules for PlayJigsaw.net
 * 
 * Powered by PlayJigsaw.net (https://playjigsaw.net/)
 */

import { PuzzleBoard } from './engine/PuzzleBoard.js';
import { SoundSynth } from './engine/SoundSynth.js';
import { ConfettiSystem } from './engine/Confetti.js';
import { GameTimer } from './ui/Timer.js';
import { GameControls } from './ui/Controls.js';

export class JigsawApp {
  constructor() {
    const canvas = document.getElementById('puzzle-canvas');
    const wrapper = document.getElementById('canvas-wrapper');
    const timerDisplay = document.getElementById('timer-display');

    this.board = new PuzzleBoard(canvas, wrapper);
    this.sound = new SoundSynth();
    this.confetti = new ConfettiSystem();
    this.timer = new GameTimer(timerDisplay);
    this.isWon = false;

    this.controls = new GameControls(this);

    this.board.resize();
    this.loadTheme('nature');
  }

  setDifficulty(pieceCount) {
    let rows = 3, cols = 4;
    if (pieceCount === 6) { rows = 2; cols = 3; }
    else if (pieceCount === 12) { rows = 3; cols = 4; }
    else if (pieceCount === 24) { rows = 4; cols = 6; }
    else if (pieceCount === 48) { rows = 6; cols = 8; }

    this.board.setDimensions(rows, cols);
    this.startNewGame();
  }

  loadTheme(themeKey) {
    this.renderThemeArt(themeKey);
    this.startNewGame();
  }

  loadCustomImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ctx = this.board.sourceCtx;
        ctx.clearRect(0, 0, this.board.sourceCanvas.width, this.board.sourceCanvas.height);
        ctx.drawImage(img, 0, 0, this.board.sourceCanvas.width, this.board.sourceCanvas.height);
        this.controls.updatePreviewImage(this.board.sourceCanvas.toDataURL('image/jpeg', 0.9));
        this.startNewGame();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  startNewGame() {
    this.isWon = false;
    this.timer.start();
    this.board.buildPieces();
    this.controls.updateProgress();
    this.controls.movesDisplay.textContent = '0';
    this.board.render();
  }

  giveHint() {
    if (this.isWon) return;
    const piece = this.board.hintRandomPiece();
    if (piece) {
      this.sound.playSnap();
      this.controls.updateProgress();
      this.controls.movesDisplay.textContent = this.board.moveCount;

      if (this.board.placedCount === this.board.totalPieces) {
        this.handleWin();
      }
      this.board.render();
    }
  }

  handleWin() {
    this.isWon = true;
    this.timer.stop();
    this.sound.playVictory();

    document.getElementById('win-time').textContent = this.timer.getFormattedTime();
    document.getElementById('win-moves').textContent = this.board.moveCount;
    document.getElementById('win-pieces').textContent = `${this.board.totalPieces} / ${this.board.totalPieces}`;

    setTimeout(() => {
      document.getElementById('victory-modal').classList.add('show');
    }, 350);

    this.confetti.explode(this.board.canvas.width * 0.5, this.board.canvas.height * 0.5, 90);
    this.runConfettiLoop();
  }

  runConfettiLoop() {
    if (!this.isWon) return;
    this.board.render(this.confetti);
    requestAnimationFrame(() => this.runConfettiLoop());
  }

  renderThemeArt(theme) {
    const ctx = this.board.sourceCtx;
    const w = this.board.sourceCanvas.width;
    const h = this.board.sourceCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (theme === 'nature') {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      skyGrad.addColorStop(0, '#1e3a8a');
      skyGrad.addColorStop(0.5, '#60a5fa');
      skyGrad.addColorStop(1, '#fed7aa');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.6);

      ctx.fillStyle = '#ffedd5';
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.35, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      ctx.lineTo(w * 0.2, h * 0.25);
      ctx.lineTo(w * 0.4, h * 0.55);
      ctx.lineTo(w * 0.65, h * 0.18);
      ctx.lineTo(w * 0.85, h * 0.5);
      ctx.lineTo(w, h * 0.3);
      ctx.lineTo(w, h * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.25);
      ctx.lineTo(w * 0.16, h * 0.32);
      ctx.lineTo(w * 0.24, h * 0.32);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w * 0.65, h * 0.18);
      ctx.lineTo(w * 0.58, h * 0.28);
      ctx.lineTo(w * 0.72, h * 0.28);
      ctx.closePath();
      ctx.fill();

      const waterGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);

      ctx.fillStyle = '#064e3b';
      for (let i = 0; i < 30; i++) {
        const tx = (i * 28) + (i % 3) * 5;
        const ty = h * 0.58 + (i % 4) * 8;
        const th = 40 + (i % 5) * 10;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - 12, ty + th);
        ctx.lineTo(tx + 12, ty + th);
        ctx.closePath();
        ctx.fill();
      }
    } else if (theme === 'sunset') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#701a75');
      grad.addColorStop(0.3, '#c026d3');
      grad.addColorStop(0.55, '#f97316');
      grad.addColorStop(0.7, '#fde047');
      grad.addColorStop(0.85, '#0284c7');
      grad.addColorStop(1, '#082f49');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.58, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h);
      ctx.quadraticCurveTo(w * 0.25, h * 0.5, w * 0.32, h * 0.3);
      ctx.lineTo(w * 0.35, h * 0.3);
      ctx.quadraticCurveTo(w * 0.27, h * 0.5, w * 0.2, h);
      ctx.closePath();
      ctx.fill();

      const cx = w * 0.33, cy = h * 0.3;
      for (let angle = 0; angle < Math.PI * 2; angle += 0.8) {
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(angle) * 70, cy + Math.sin(angle) * 35, 75, 16, angle, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === 'aurora') {
      const night = ctx.createLinearGradient(0, 0, 0, h);
      night.addColorStop(0, '#030712');
      night.addColorStop(1, '#0f172a');
      ctx.fillStyle = night;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 120; i++) {
        const sx = (i * 97) % w;
        const sy = (i * 61) % (h * 0.7);
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3 === 0) ? 1.5 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      const ribbon1 = ctx.createLinearGradient(0, h * 0.2, w, h * 0.4);
      ribbon1.addColorStop(0, 'rgba(16, 185, 129, 0)');
      ribbon1.addColorStop(0.3, 'rgba(52, 211, 153, 0.7)');
      ribbon1.addColorStop(0.6, 'rgba(6, 182, 212, 0.8)');
      ribbon1.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
      ctx.fillStyle = ribbon1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.4);
      ctx.bezierCurveTo(w * 0.3, h * 0.1, w * 0.7, h * 0.5, w, h * 0.2);
      ctx.lineTo(w, h * 0.35);
      ctx.bezierCurveTo(w * 0.7, h * 0.65, w * 0.3, h * 0.25, 0, h * 0.55);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.8);
      ctx.quadraticCurveTo(w * 0.3, h * 0.7, w * 0.6, h * 0.85);
      ctx.quadraticCurveTo(w * 0.85, h * 0.95, w, h * 0.78);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    } else if (theme === 'castle') {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#312e81');
      sky.addColorStop(0.6, '#9333ea');
      sky.addColorStop(1, '#f472b6');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
      ctx.beginPath();
      ctx.arc(w * 0.8, h * 0.25, 70, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(w * 0.38, h * 0.45, w * 0.24, h * 0.4);
      ctx.fillRect(w * 0.28, h * 0.35, w * 0.08, h * 0.5);
      ctx.fillRect(w * 0.64, h * 0.35, w * 0.08, h * 0.5);
    } else if (theme === 'cats') {
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#fef08a');
      bg.addColorStop(1, '#fed7aa');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.58, 120, 90, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.4, 75, 0, Math.PI * 2);
      ctx.fill();
    }

    this.controls.updatePreviewImage(this.board.sourceCanvas.toDataURL('image/jpeg', 0.9));
  }
}

// Bootstrap on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new JigsawApp();
});
