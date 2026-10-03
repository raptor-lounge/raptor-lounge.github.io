/**
 * Controls.js - UI Event Listeners & Interaction Binding
 * 
 * Part of PlayJigsaw.net Open Source Engine (https://playjigsaw.net/)
 */

export class GameControls {
  constructor(app) {
    this.app = app;

    this.puzzleSelect = document.getElementById('puzzle-select');
    this.difficultySelect = document.getElementById('difficulty-select');
    this.btnShuffle = document.getElementById('btn-shuffle');
    this.btnPreview = document.getElementById('btn-preview');
    this.btnGhost = document.getElementById('btn-ghost');
    this.btnHint = document.getElementById('btn-hint');
    this.btnSound = document.getElementById('btn-sound');
    this.customInput = document.getElementById('custom-image-input');
    this.previewPopup = document.getElementById('preview-popup');
    this.previewImg = document.getElementById('preview-img');
    this.btnClosePreview = document.getElementById('btn-close-preview');
    this.movesDisplay = document.getElementById('moves-display');
    this.progressDisplay = document.getElementById('progress-display');
    this.victoryModal = document.getElementById('victory-modal');
    this.btnPlayAgain = document.getElementById('btn-play-again');

    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.app.board.resize();
      this.app.board.setupBoardLayout();
      this.app.board.render();
    });

    this.puzzleSelect.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        this.customInput.click();
      } else {
        this.app.loadTheme(e.target.value);
      }
    });

    this.customInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.app.loadCustomImage(e.target.files[0]);
      }
    });

    this.difficultySelect.addEventListener('change', (e) => {
      const count = parseInt(e.target.value, 10);
      this.app.setDifficulty(count);
    });

    this.btnShuffle.addEventListener('click', () => {
      this.app.startNewGame();
    });

    this.btnPreview.addEventListener('click', () => {
      this.previewPopup.classList.toggle('show');
    });

    this.btnClosePreview.addEventListener('click', () => {
      this.previewPopup.classList.remove('show');
    });

    this.btnGhost.addEventListener('click', () => {
      this.app.board.showGhost = !this.app.board.showGhost;
      this.btnGhost.style.opacity = this.app.board.showGhost ? '1' : '0.6';
      this.app.board.render();
    });

    this.btnHint.addEventListener('click', () => {
      this.app.giveHint();
    });

    this.btnSound.addEventListener('click', () => {
      const enabled = this.app.sound.toggle();
      this.btnSound.textContent = enabled ? '🔊' : '🔇';
    });

    this.btnPlayAgain.addEventListener('click', () => {
      this.victoryModal.classList.remove('show');
      this.app.startNewGame();
    });

    // Canvas Drag & Drop Listeners
    const canvas = this.app.board.canvas;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        // The canvas is responsive, so browser pixels and canvas pixels are
        // often different sizes inside the Raptor Lounge player.
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const onPointerDown = (pos) => {
      if (this.app.isWon) return;
      const hit = this.app.board.getPieceAt(pos.x, pos.y);
      if (hit) {
        this.app.board.selectedPiece = this.app.board.bringToTop(hit.index);
        this.dragOffsetX = pos.x - this.app.board.selectedPiece.x;
        this.dragOffsetY = pos.y - this.app.board.selectedPiece.y;
        this.app.sound.playPickup();
        this.app.board.render();
      }
    };

    const onPointerMove = (pos) => {
      if (this.app.board.selectedPiece) {
        this.app.board.selectedPiece.x = pos.x - this.dragOffsetX;
        this.app.board.selectedPiece.y = pos.y - this.dragOffsetY;
        this.app.board.render();
      }
    };

    const onPointerUp = () => {
      if (!this.app.board.selectedPiece) return;
      const p = this.app.board.selectedPiece;
      this.app.board.selectedPiece = null;
      this.app.board.moveCount++;
      this.movesDisplay.textContent = this.app.board.moveCount;

      const snapped = this.app.board.checkSnap(p);
      if (snapped) {
        this.app.sound.playSnap();
        this.updateProgress();

        if (this.app.board.placedCount === this.app.board.totalPieces) {
          this.app.handleWin();
        }
      }

      this.app.board.render();
    };

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onPointerDown(getPos(e));
    });

    window.addEventListener('mousemove', (e) => {
      onPointerMove(getPos(e));
    });

    window.addEventListener('mouseup', () => {
      onPointerUp();
    });

    // Touch Support
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onPointerDown(getPos(e));
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.app.board.selectedPiece) {
        e.preventDefault();
        onPointerMove(getPos(e));
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      onPointerUp();
    });
  }

  updateProgress() {
    this.progressDisplay.textContent = `${this.app.board.placedCount} / ${this.app.board.totalPieces}`;
  }

  updatePreviewImage(dataUrl) {
    this.previewImg.src = dataUrl;
  }
}
