# 📐 Bézier Jigsaw Puzzle Geometry & Slicing Algorithm

This document details the mathematical implementation behind the dynamic piece generation in **Play Jigsaw Puzzles Online**, the open-source engine for [PlayJigsaw.net](https://playjigsaw.net/).

---

## 1. Overview of Piece Connectivity

In an $M \times N$ puzzle grid:
- There are $(M - 1) \times N$ internal **horizontal edges**.
- There are $M \times (N - 1)$ internal **vertical edges**.
- Each internal edge between two neighboring pieces $P_A$ and $P_B$ is shared: if $P_A$ has a **tab** (+1 protrusion), then $P_B$ must have a matching **blank** (-1 indent).
- Perimeter edges bordering the outside canvas are flat borders (value `0`).

---

## 2. Cubic Bézier Curve Geometry

A cubic Bézier curve is defined by four points: start point $P_0$, end point $P_3$, and two control points $P_1, P_2$:

$$B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3, \quad t \in [0, 1]$$

To produce the interlocking neck and head of a puzzle tab:

1. Let the edge vector be $\vec{v} = (x_2 - x_1, y_2 - y_1)$ with length $L = \|\vec{v}\|$.
2. The unit normal vector pointing perpendicular to the edge is:
   $$\vec{n} = \left(-\frac{y_2 - y_1}{L}, \frac{x_2 - x_1}{L}\right)$$
3. The sign variable $S \in \{+1, -1\}$ controls whether the tab points outward or inward.
4. Seven key anchor points define the smooth bulb contour:
   - $p_1 = (0.38 L, 0)$
   - $p_2 = (0.42 L, 0.30 \cdot \text{tabSize} \cdot S)$
   - $p_3 = (0.35 L, 1.05 \cdot \text{tabSize} \cdot S)$
   - $p_4 = (0.50 L, 1.15 \cdot \text{tabSize} \cdot S)$ (Bulb apex)
   - $p_5 = (0.65 L, 1.05 \cdot \text{tabSize} \cdot S)$
   - $p_6 = (0.58 L, 0.30 \cdot \text{tabSize} \cdot S)$
   - $p_7 = (0.62 L, 0)$

---

## 3. Pixel Slicing & Isolated Canvas Clipping

Each piece $P_{r,c}$ is rendered onto an isolated offscreen canvas:
1. `ctx.beginPath()` traces the 4 computed Bézier edges.
2. `ctx.clip()` masks the rendering region to the piece contour.
3. `ctx.drawImage()` copies the corresponding slice from the master image.
4. `ctx.stroke()` draws a 2px translucent gradient highlight along the edge for a 3D tactile finish.

For more information and to play online, visit [PlayJigsaw.net - Free Online Jigsaw Puzzles](https://playjigsaw.net/).
