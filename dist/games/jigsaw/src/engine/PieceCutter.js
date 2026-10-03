/**
 * PieceCutter.js - Mathematical Jigsaw Piece Generation
 * Uses cubic Bézier curves to create interlocking male tabs and female blanks.
 * 
 * Part of PlayJigsaw.net Open Source Engine (https://playjigsaw.net/)
 */

export class PieceCutter {
  /**
   * Generates the edge grid matrix with tabs (+1), blanks (-1), and borders (0)
   * @param {number} rows 
   * @param {number} cols 
   * @returns {{ hEdges: number[][], vEdges: number[][] }}
   */
  static generateEdgeMatrix(rows, cols) {
    const hEdges = [];
    for (let r = 0; r < rows - 1; r++) {
      hEdges[r] = [];
      for (let c = 0; c < cols; c++) {
        hEdges[r][c] = Math.random() < 0.5 ? 1 : -1;
      }
    }

    const vEdges = [];
    for (let r = 0; r < rows; r++) {
      vEdges[r] = [];
      for (let c = 0; c < cols - 1; c++) {
        vEdges[r][c] = Math.random() < 0.5 ? 1 : -1;
      }
    }

    return { hEdges, vEdges };
  }

  /**
   * Traces a cubic Bézier puzzle edge onto a 2D Canvas context
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} x1 Start X
   * @param {number} y1 Start Y
   * @param {number} x2 End X
   * @param {number} y2 End Y
   * @param {number} type 1 (tab), -1 (blank), 0 (flat edge)
   * @param {number} tabSize Protrusion radius
   */
  static drawEdge(ctx, x1, y1, x2, y2, type, tabSize) {
    if (type === 0) {
      ctx.lineTo(x2, y2);
      return;
    }

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    // Normal vector perpendicular to edge
    const nx = -dy / len;
    const ny = dx / len;
    const sign = type;

    // Control points shaping the classic jigsaw interlocking head and neck
    const p1x = x1 + dx * 0.38;
    const p1y = y1 + dy * 0.38;

    const p2x = x1 + dx * 0.42 + nx * tabSize * 0.3 * sign;
    const p2y = y1 + dy * 0.42 + ny * tabSize * 0.3 * sign;

    const p3x = x1 + dx * 0.35 + nx * tabSize * 1.05 * sign;
    const p3y = y1 + dy * 0.35 + ny * tabSize * 1.05 * sign;

    const p4x = x1 + dx * 0.5 + nx * tabSize * 1.15 * sign;
    const p4y = y1 + dy * 0.5 + ny * tabSize * 1.15 * sign;

    const p5x = x1 + dx * 0.65 + nx * tabSize * 1.05 * sign;
    const p5y = y1 + dy * 0.65 + ny * tabSize * 1.05 * sign;

    const p6x = x1 + dx * 0.58 + nx * tabSize * 0.3 * sign;
    const p6y = y1 + dy * 0.58 + ny * tabSize * 0.3 * sign;

    const p7x = x1 + dx * 0.62;
    const p7y = y1 + dy * 0.62;

    ctx.lineTo(p1x, p1y);
    ctx.bezierCurveTo(p2x, p2y, p3x, p3y, p4x, p4y);
    ctx.bezierCurveTo(p5x, p5y, p6x, p6y, p7x, p7y);
    ctx.lineTo(x2, y2);
  }

  /**
   * Clips and renders a single puzzle piece onto an isolated offscreen canvas
   * @param {Object} piece 
   * @param {HTMLCanvasElement|Image} sourceImage 
   * @param {number} pieceWidth 
   * @param {number} pieceHeight 
   * @param {number} totalRows 
   * @param {number} totalCols 
   * @returns {HTMLCanvasElement}
   */
  static renderPieceToCanvas(piece, sourceImage, pieceWidth, pieceHeight, totalRows, totalCols) {
    const tabSize = Math.min(pieceWidth, pieceHeight) * 0.22;
    const margin = tabSize * 1.5;
    const pCanvas = document.createElement('canvas');
    pCanvas.width = pieceWidth + margin * 2;
    pCanvas.height = pieceHeight + margin * 2;
    const pCtx = pCanvas.getContext('2d');

    const ox = margin;
    const oy = margin;

    pCtx.save();
    pCtx.beginPath();
    pCtx.moveTo(ox, oy);

    // Draw 4 perimeter edges (Top, Right, Bottom, Left)
    PieceCutter.drawEdge(pCtx, ox, oy, ox + pieceWidth, oy, piece.edges.top, tabSize);
    PieceCutter.drawEdge(pCtx, ox + pieceWidth, oy, ox + pieceWidth, oy + pieceHeight, piece.edges.right, tabSize);
    PieceCutter.drawEdge(pCtx, ox + pieceWidth, oy + pieceHeight, ox, oy + pieceHeight, piece.edges.bottom, tabSize);
    PieceCutter.drawEdge(pCtx, ox, oy + pieceHeight, ox, oy, piece.edges.left, tabSize);
    pCtx.closePath();

    pCtx.clip();

    // Source slice calculation
    const sw = (1 / totalCols) * sourceImage.width;
    const sh = (1 / totalRows) * sourceImage.height;
    const sx = (piece.col / totalCols) * sourceImage.width;
    const sy = (piece.row / totalRows) * sourceImage.height;

    const sMarginX = (margin / pieceWidth) * sw;
    const sMarginY = (margin / pieceHeight) * sh;

    pCtx.drawImage(
      sourceImage,
      sx - sMarginX, sy - sMarginY, sw + sMarginX * 2, sh + sMarginY * 2,
      0, 0, pCanvas.width, pCanvas.height
    );

    // Bevel edge lighting highlight
    pCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    pCtx.lineWidth = 2;
    pCtx.stroke();

    pCtx.restore();

    piece.offscreenCanvas = pCanvas;
    piece.canvasMargin = margin;
    return pCanvas;
  }
}
