(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const shotsEl = document.getElementById('shots');
  const bestEl = document.getElementById('best');
  const messageEl = document.getElementById('message');
  const restartEl = document.getElementById('restart');

  const W = canvas.width, H = canvas.height;
  const COLORS = ['#ff5e7e', '#ffd166', '#80ed99', '#4cc9f0', '#c98bff'];
  const DX = 40, DY = 36, R = 17, OX = 26, TOP = 26;
  const ROWS = 13, BASE_COLS = 11;
  const BEST_KEY = 'bubble-best';

  let grid, shooter, proj, aim, score, shots, best, over;

  const colsInRow = (r) => (r % 2 ? BASE_COLS - 1 : BASE_COLS);
  const cellX = (c, r) => OX + c * DX + (r % 2 ? DX / 2 : 0) + R;
  const cellY = (r) => TOP + r * DY + R;

  function neighbors(r, c) {
    const even = r % 2 === 0;
    const list = even
      ? [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]]
      : [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]];
    return list.filter(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < colsInRow(rr));
  }

  function bestKey() { try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (e) { return 0; } }

  function newGame() {
    score = 0; shots = 0; over = false;
    best = bestKey();
    scoreEl.textContent = '0'; shotsEl.textContent = '0'; bestEl.textContent = String(best);
    messageEl.textContent = 'Aim with the mouse, click to fire.';
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid.push([]);
      for (let c = 0; c < colsInRow(r); c++)
        grid[r].push(r < 6 ? COLORS[Math.floor(Math.random() * COLORS.length)] : null);
    }
    shooter = { x: W / 2, y: H - 40, color: COLORS[Math.floor(Math.random() * COLORS.length)] };
    proj = null; aim = { x: W / 2, y: 0 };
    draw();
  }

  function fire() {
    if (proj || over) return;
    let dx = aim.x - shooter.x, dy = aim.y - shooter.y;
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    proj = { x: shooter.x, y: shooter.y, vx: dx * 9, vy: dy * 9, color: shooter.color };
    shots++; shotsEl.textContent = String(shots);
    shooter.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function snap() {
    let r = Math.round((proj.y - TOP - R) / DY);
    if (r < 0) r = 0;
    const c = Math.round((proj.x - OX - (r % 2 ? DX / 2 : 0) - R) / DX);
    r = Math.max(0, Math.min(ROWS - 1, r));
    const cc = Math.max(0, Math.min(colsInRow(r) - 1, c));
    if (grid[r][cc]) { // find nearest empty
      let best = null, bd = 1e9;
      for (let rr = 0; rr < ROWS; rr++)
        for (let cc2 = 0; cc2 < colsInRow(rr); cc2++)
          if (!grid[rr][cc2]) {
            const d = Math.hypot(cellX(cc2, rr) - proj.x, cellY(rr) - proj.y);
            if (d < bd) { bd = d; best = [rr, cc2]; }
          }
      if (best) { r = best[0]; grid[r][best[1]] = proj.color; }
      else { over = true; }
    } else grid[r][cc] = proj.color;
    proj = null;
    resolve(r, cc);
  }

  function resolve(r, c) {
    const color = grid[r][c];
    const group = [], seen = new Set();
    (function flood(rr, cc) {
      const key = rr + ',' + cc; if (seen.has(key)) return;
      seen.add(key); group.push([rr, cc]);
      for (const [nr, nc] of neighbors(rr, cc))
        if (grid[nr][nc] === color) flood(nr, nc);
    })(r, c);

    if (group.length >= 3) {
      group.forEach(([rr, cc]) => grid[rr][cc] = null);
      score += group.length * 10;
      scoreEl.textContent = String(score);
      if (score > best) { best = score; bestEl.textContent = String(best); try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
      dropFloating();
    }
    checkBottom();
  }

  function dropFloating() {
    const seen = new Set();
    const stack = [];
    for (let c = 0; c < colsInRow(0); c++) if (grid[0][c]) stack.push([0, c]);
    while (stack.length) {
      const [r, c] = stack.pop(); const key = r + ',' + c;
      if (seen.has(key)) continue; seen.add(key);
      for (const [nr, nc] of neighbors(r, c)) if (grid[nr][nc]) stack.push([nr, nc]);
    }
    for (let r = 1; r < ROWS; r++)
      for (let c = 0; c < colsInRow(r); c++)
        if (grid[r][c] && !seen.has(r + ',' + c)) { grid[r][c] = null; score += 20; }
    scoreEl.textContent = String(score);
  }

  function checkBottom() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < colsInRow(r); c++)
        if (grid[r][c] && cellY(r) + R >= shooter.y - 6) { over = true; messageEl.textContent = 'Bubbles reached the line! Game Over.'; }
    let any = false;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < colsInRow(r); c++) if (grid[r][c]) any = true;
    if (!any) { over = true; messageEl.textContent = 'Cleared! Press New Game.'; }
  }

  function update() {
    if (!proj) return;
    proj.x += proj.vx; proj.y += proj.vy;
    if (proj.x < R) { proj.x = R; proj.vx *= -1; }
    if (proj.x > W - R) { proj.x = W - R; proj.vx *= -1; }
    if (proj.y <= TOP + R) { snap(); return; }
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < colsInRow(r); c++)
        if (grid[r][c] && Math.hypot(cellX(c, r) - proj.x, cellY(r) - proj.y) < R * 1.8) { snap(); return; }
  }

  function draw() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141a3a'); g.addColorStop(1, '#0a0c1d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < colsInRow(r); c++) {
        const col = grid[r][c]; if (!col) continue;
        ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = col;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cellX(c, r), cellY(r), R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    // aim line
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(shooter.x, shooter.y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); ctx.setLineDash([]);
    // shooter
    ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = shooter.color;
    ctx.fillStyle = shooter.color; ctx.beginPath(); ctx.arc(shooter.x, shooter.y, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (proj) { ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = proj.color; ctx.fillStyle = proj.color; ctx.beginPath(); ctx.arc(proj.x, proj.y, R, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (over) { ctx.fillStyle = 'rgba(10,12,29,0.6)'; ctx.fillRect(0, 0, W, H); }
  }

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    aim.x = (e.clientX - rect.left) * (W / rect.width);
    aim.y = (e.clientY - rect.top) * (H / rect.height);
  });
  canvas.addEventListener('click', fire);
  restartEl.addEventListener('click', newGame);

  function loop() { update(); draw(); requestAnimationFrame(loop); }
  newGame(); requestAnimationFrame(loop);
})();
