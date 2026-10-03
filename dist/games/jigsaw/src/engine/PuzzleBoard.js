/**
 * PuzzleBoard.js - Main Canvas Rendering & Physics Orchestrator
 * 
 * Part of PlayJigsaw.net Open Source Engine (https://playjigsaw.net/)
 */

import { PieceCutter } from './PieceCutter.js';

export class PuzzleBoard {
  constructor(canvas, wrapper) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.wrapper = wrapper;

    this.rows = 3;
    this.cols = 4;
    this.totalPieces = 12;
    this.pieces = [];
    this.selectedPiece = null;

    this.boardWidth = 0;
    this.boardHeight = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.pieceWidth = 0;
    this.pieceHeight = 0;

    this.showGhost = true;
    this.placedCount = 0;
    this.moveCount = 0;

    this.sourceCanvas = document.createElement('canvas');
    this.sourceCtx = this.sourceCanvas.getContext('2d');
    this.sourceCanvas.width = 800;
    this.sourceCanvas.height = 600;
  }

  resize() {
    const rect = this.wrapper.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  setDimensions(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.totalPieces = rows * cols;
  }

  setupBoardLayout() {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const padding = 30;
    const maxBoardW = Math.min(cw * 0.65, 750);
    const maxBoardH = Math.min(ch - padding * 2, 550);

    let bw = maxBoardW;
    let bh = bw * 0.75;
    if (bh > maxBoardH) {
      bh = maxBoardH;
      bw = bh / 0.75;
    }

    this.boardWidth = bw;
    this.boardHeight = bh;
    this.boardX = Math.max(padding, (cw - bw) / 2);
    this.boardY = (ch - bh) / 2;

    this.pieceWidth = this.boardWidth / this.cols;
    this.pieceHeight = this.boardHeight / this.rows;
  }

  buildPieces() {
    this.setupBoardLayout();
    this.placedCount = 0;
    this.moveCount = 0;
    this.selectedPiece = null;

    const { hEdges, vEdges } = PieceCutter.generateEdgeMatrix(this.rows, this.cols);
    this.pieces = [];

    const cw = this.canvas.width;
    const ch = this.canvas.height;

    const trayAreas = [
      { minX: 10, maxX: Math.max(10, this.boardX - this.pieceWidth - 10), minY: 20, maxY: ch - this.pieceHeight - 20 },
      { minX: Math.min(cw - this.pieceWidth - 20, this.boardX + this.boardWidth + 10), maxX: cw - this.pieceWidth - 10, minY: 20, maxY: ch - this.pieceHeight - 20 }
    ];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const topEdge = (r === 0) ? 0 : -hEdges[r - 1][c];
        const rightEdge = (c === this.cols - 1) ? 0 : vEdges[r][c];
        const bottomEdge = (r === this.rows - 1) ? 0 : hEdges[r][c];
        const leftEdge = (c === 0) ? 0 : -vEdges[r][c - 1];

        const correctX = this.boardX + c * this.pieceWidth;
        const correctY = this.boardY + r * this.pieceHeight;

        const side = Math.random() < 0.5 ? 0 : 1;
        const area = trayAreas[side];

        let startX, startY;
        if (area.maxX > area.minX) {
          startX = area.minX + Math.random() * (area.maxX - area.minX);
          startY = area.minY + Math.random() * (area.maxY - area.minY);
        } else {
          startX = Math.random() * (cw - this.pieceWidth);
          startY = Math.random() * (ch - this.pieceHeight);
        }

        const piece = {
          id: `${r}-${c}`,
          row: r,
          col: c,
          x: startX,
          y: startY,
          correctX: correctX,
          correctY: correctY,
          edges: { top: topEdge, right: rightEdge, bottom: bottomEdge, left: leftEdge },
          isPlaced: false
        };

        PieceCutter.renderPieceToCanvas(piece, this.sourceCanvas, this.pieceWidth, this.pieceHeight, this.rows, this.cols);
        this.pieces.push(piece);
      }
    }
  }

  getPieceAt(posX, posY) {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      if (!p.isPlaced) {
        if (posX >= p.x && posX <= p.x + this.pieceWidth &&
            posY >= p.y && posY <= p.y + this.pieceHeight) {
          return { piece: p, index: i };
        }
      }
    }
    return null;
  }

  bringToTop(index) {
    const p = this.pieces.splice(index, 1)[0];
    this.pieces.push(p);
    return p;
  }

  checkSnap(piece) {
    const snapThreshold = Math.max(26, this.pieceWidth * 0.28);
    const dist = Math.hypot(piece.x - piece.correctX, piece.y - piece.correctY);

    if (dist < snapThreshold) {
      piece.x = piece.correctX;
      piece.y = piece.correctY;
      piece.isPlaced = true;
      this.placedCount++;
      return true;
    }
    return false;
  }

  hintRandomPiece() {
    const unplaced = this.pieces.filter(p => !p.isPlaced);
    if (unplaced.length === 0) return null;

    const target = unplaced[Math.floor(Math.random() * unplaced.length)];
    target.x = target.correctX;
    target.y = target.correctY;
    target.isPlaced = true;
    this.placedCount++;
    this.moveCount++;
    return target;
  }

  render(confettiSystem = null) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // 1. Board Frame
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.fillRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);
    ctx.strokeRect(this.boardX, this.boardY, this.boardWidth, this.boardHeight);
    ctx.restore();

    // 2. Ghost Guide
    if (this.showGhost) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.drawImage(this.sourceCanvas, this.boardX, this.boardY, this.boardWidth, this.boardHeight);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let r = 1; r < this.rows; r++) {
        const gy = this.boardY + r * this.pieceHeight;
        ctx.beginPath();
        ctx.moveTo(this.boardX, gy);
        ctx.lineTo(this.boardX + this.boardWidth, gy);
        ctx.stroke();
      }
      for (let c = 1; c < this.cols; c++) {
        const gx = this.boardX + c * this.pieceWidth;
        ctx.beginPath();
        ctx.moveTo(gx, this.boardY);
        ctx.lineTo(gx, this.boardY + this.boardHeight);
        ctx.stroke();
      }
    }

    // 3. Placed Pieces
    this.pieces.forEach(p => {
      if (p.isPlaced) {
        ctx.drawImage(p.offscreenCanvas, p.x - p.canvasMargin, p.y - p.canvasMargin);
      }
    });

    // 4. Unplaced Pieces
    this.pieces.forEach(p => {
      if (!p.isPlaced && p !== this.selectedPiece) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.drawImage(p.offscreenCanvas, p.x - p.canvasMargin, p.y - p.canvasMargin);
        ctx.restore();
      }
    });

    // 5. Dragging Piece
    if (this.selectedPiece) {
      const p = this.selectedPiece;
      ctx.save();
      ctx.shadowColor = 'rgba(99, 102, 241, 0.75)';
      ctx.shadowBlur = 18;
      ctx.drawImage(p.offscreenCanvas, p.x - p.canvasMargin, p.y - p.canvasMargin);
      ctx.restore();
    }

    // 6. Confetti
    if (confettiSystem) {
      confettiSystem.updateAndRender(ctx);
    }
  }
}
