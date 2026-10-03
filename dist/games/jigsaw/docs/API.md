# 📚 PlayJigsaw Engine API Reference

Documentation for the modular JavaScript classes powering **Play Jigsaw Puzzles Online** ([PlayJigsaw.net](https://playjigsaw.net/)).

---

## 1. `PieceCutter` (`src/engine/PieceCutter.js`)
Handles mathematical Bézier computations and edge assignment.

### Methods
- `static generateEdgeMatrix(rows, cols)`
  - Returns `{ hEdges, vEdges }` representing tab/blank directions for all grid coordinates.
- `static drawEdge(ctx, x1, y1, x2, y2, type, tabSize)`
  - Traces cubic Bézier edge paths onto canvas context.
- `static renderPieceToCanvas(piece, sourceImage, pieceWidth, pieceHeight, totalRows, totalCols)`
  - Creates a clipped offscreen canvas for an individual puzzle piece.

---

## 2. `PuzzleBoard` (`src/engine/PuzzleBoard.js`)
Main Canvas orchestrator managing pieces, drag positions, and rendering loop.

### Properties
- `pieces`: Array of puzzle piece objects `{ id, row, col, x, y, correctX, correctY, isPlaced }`.
- `placedCount`: Number of successfully snapped pieces.
- `moveCount`: Total moves made by player.
- `showGhost`: Boolean toggle for background preview guide.

### Methods
- `resize()`: Recalculates canvas dimensions to match container width/height.
- `buildPieces()`: Cuts and scatters puzzle pieces around the board area.
- `checkSnap(piece)`: Detects if piece is within magnetic threshold and locks it if valid.
- `hintRandomPiece()`: Automatically selects and snaps an unplaced piece to its correct slot.
- `render(confettiSystem)`: Redraws board frame, ghost overlay, and pieces.

---

## 3. `SoundSynth` (`src/engine/SoundSynth.js`)
Web Audio API procedural sound engine.

### Methods
- `playPickup()`: Short high-frequency pop sound on piece grab.
- `playSnap()`: Satisfying acoustic triangle chime on piece lock.
- `playVictory()`: Arpeggiated A-Major chord fanfare on game win.
- `toggle()`: Mutes or unmutes sound effects.

---

## 4. `ConfettiSystem` (`src/engine/Confetti.js`)
Particle simulation engine for celebration effects.

### Methods
- `explode(originX, originY, count)`: Generates vibrant particle physics burst.
- `updateAndRender(ctx)`: Advances particle physics (gravity, rotation, fade) and renders onto canvas.

---

For live playable puzzles, visit [PlayJigsaw.net](https://playjigsaw.net/).
