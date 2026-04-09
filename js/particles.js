// ============================================================
// particles.js — Floating Text Particles
// ============================================================

export function createParticle(x, y, text, color, duration) {
  return { x, y, text, color, life: duration || 0.8, maxLife: duration || 0.8, vy: -40 };
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.y += p.vy * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function renderParticles(ctx, particles, camera) {
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x - camera.x, p.y - camera.y);
  }
  ctx.globalAlpha = 1;
}
