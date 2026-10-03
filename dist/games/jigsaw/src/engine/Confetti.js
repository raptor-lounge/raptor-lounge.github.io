/**
 * Confetti.js - Victory Particle Physics System
 * Creates dynamic celebratory confetti explosions on puzzle completion.
 * 
 * Part of PlayJigsaw.net Open Source Engine (https://playjigsaw.net/)
 */

export class ConfettiSystem {
  constructor() {
    this.particles = [];
    this.colors = ['#6366f1', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ffffff'];
  }

  explode(originX, originY, count = 90) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: Math.random() * 8 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12
      });
    }
  }

  updateAndRender(ctx) {
    if (this.particles.length === 0) return false;

    let hasAlive = false;
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28; // Gravity
      p.vx *= 0.98; // Air drag
      p.alpha *= 0.975;
      p.rotation += p.rotSpeed;

      if (p.alpha > 0.01) {
        hasAlive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    return hasAlive;
  }
}
