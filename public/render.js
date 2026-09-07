import { TAU } from './engine.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.turtle = new Image(); this.turtle.src = '/turtle.svg';
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  resize(w, h) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  draw(game, clock) {
    const x = this.ctx, w = game.width, h = game.height;
    const t = this.reducedMotion ? 0 : clock;
    const zone = Math.min(2, Math.floor(game.time / 100));
    const colors = [['#0d353c', '#061d27'], ['#162f42', '#091d30'], ['#24283b', '#0b1728']][zone];
    const bg = x.createLinearGradient(0, 0, w, h); bg.addColorStop(0, colors[0]); bg.addColorStop(1, colors[1]);
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    // Bathymetric contours, suspended plankton, and a quiet moving sonar sweep.
    x.lineWidth = 1;
    for (let row = -1; row < h / 55 + 2; row++) {
      x.beginPath();
      for (let i = -10; i <= w + 10; i += 12) {
        const y = row * 55 + Math.sin(i * .007 + row * .7 + t * .08) * 30 + Math.sin(i * .018 + row) * 9;
        if (i === -10) x.moveTo(i, y); else x.lineTo(i, y);
      }
      x.strokeStyle = '#98c8b40c'; x.stroke();
    }
    x.save(); x.translate(w * .66, h * .46);
    x.strokeStyle = '#a1c3b70b';
    for (let r = 100; r < w; r += 140) { x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); }
    x.rotate(t * .12); x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.stroke(); x.restore();
    for (let i = 0; i < 65; i++) {
      const px = (i * 137.3 + Math.sin(t * .2 + i) * 12) % w;
      const py = ((i * 79.1 - t * (3 + i % 5)) % h + h) % h;
      x.globalAlpha = .12 + .15 * (1 + Math.sin(t + i)) / 2;
      x.fillStyle = '#cce5b5'; this.circle(px, py, i % 3 === 0 ? 1.5 : .7);
    }
    x.globalAlpha = 1;
    this.reef(w, h, t);
    if (game.state === 'menu') return;
    x.save();
    if (!this.reducedMotion && game.shake > 0) x.translate(Math.sin(t * 99) * game.shake, Math.cos(t * 111) * game.shake);
    for (const d of game.drops) {
      x.save(); x.translate(d.x, d.y);
      if (d.kind === 'mine') {
        x.strokeStyle = '#f1c87655'; x.beginPath(); x.arc(0, 0, 20 + Math.sin(t * 7) * 3, 0, TAU); x.stroke();
        x.fillStyle = d.life > 7.3 ? '#f1c87666' : '#f1c876';
        this.star(10, 16, 7);
      } else {
        x.rotate(t * .8); x.shadowBlur = 12; x.shadowColor = '#f1c876'; x.fillStyle = '#f1c876';
        x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 0); x.lineTo(0, 7); x.lineTo(-5, 0); x.closePath(); x.fill();
      }
      x.restore();
    }
    for (const e of game.enemies) this.enemy(e, t);
    for (const b of game.shots) {
      x.save(); x.translate(b.x, b.y); x.rotate(Math.atan2(b.vy, b.vx));
      x.fillStyle = b.enemy ? '#ffd29a' : '#d9f4bc'; x.shadowColor = x.fillStyle; x.shadowBlur = 8;
      if (b.enemy) { this.circle(0, 0, b.r); x.fillStyle = '#fff7dc'; this.circle(0, 0, 2); }
      else { x.fillRect(-12, -1.5, 20, 3); x.beginPath(); x.moveTo(11, 0); x.lineTo(5, -4); x.lineTo(5, 4); x.fill(); }
      x.restore();
    }
    const p = game.player;
    if (p.orbits) for (let i = 0; i < p.orbits; i++) {
      const a = game.time * 2.8 + i * TAU / p.orbits;
      x.save(); x.translate(p.x + Math.cos(a) * 72, p.y + Math.sin(a) * 72); x.rotate(a);
      x.fillStyle = '#c6efc1'; x.shadowBlur = 15; x.shadowColor = '#c6efc1'; this.star(6, 13, 4); x.restore();
    }
    x.save(); x.translate(p.x, p.y);
    if (p.invulnerable > 0) { x.strokeStyle = '#d3ed8b88'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 31, 0, TAU); x.stroke(); }
    x.rotate(p.aim); x.shadowColor = '#a6e5a0'; x.shadowBlur = 16;
    x.globalAlpha = p.invulnerable > .3 ? .7 : 1;
    if (this.turtle.complete && this.turtle.naturalWidth) x.drawImage(this.turtle, -27, -27, 54, 54);
    else { x.fillStyle = '#a2d6a0'; x.beginPath(); x.ellipse(0, 0, 23, 16, 0, 0, TAU); x.fill(); this.circle(23, 0, 8); }
    x.strokeStyle = '#e7f5cb'; x.lineWidth = 3; x.beginPath(); x.moveTo(20, 0); x.lineTo(37, 0); x.stroke(); x.restore();
    for (const q of game.particles) { x.globalAlpha = Math.min(1, q.life * 2.5); x.fillStyle = q.color; this.circle(q.x, q.y, q.r); }
    x.globalAlpha = 1;
    for (const r of game.rings) { x.strokeStyle = r.color; x.globalAlpha = r.life / .3; x.lineWidth = 2; x.beginPath(); x.arc(r.x, r.y, r.r * (1 - r.life / .4), 0, TAU); x.stroke(); }
    x.globalAlpha = 1; x.restore();
  }
  circle(a, b, r) { const x = this.ctx; x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); }
  star(inner, outer, points) {
    const x = this.ctx; x.beginPath();
    for (let i = 0; i < points * 2; i++) { const a = i * Math.PI / points, r = i % 2 ? inner : outer; if (!i) x.moveTo(Math.cos(a) * r, Math.sin(a) * r); else x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    x.closePath(); x.fill();
  }
  reef(w, h, t) {
    const x = this.ctx;
    for (let i = 0; i < 14; i++) {
      const px = i * w / 13, high = 14 + (i * 17) % 35;
      x.fillStyle = '#051b23'; x.beginPath(); x.ellipse(px, h + 8, 25 + i % 4 * 12, high, 0, 0, TAU); x.fill();
      for (let j = 0; j < 3; j++) {
        const tip = px + Math.sin(t * .65 + i + j) * 10 + j * 5;
        x.strokeStyle = ['#285049', '#34544d', '#30545a'][i % 3]; x.lineWidth = 2;
        x.beginPath(); x.moveTo(px + j * 4, h); x.quadraticCurveTo(px - 8 + j * 7, h - high, tip, h - high * 1.7); x.stroke();
      }
    }
  }
  enemy(e, t) {
    const x = this.ctx, r = e.r, kind = e.t.kind;
    x.save(); x.translate(e.x, e.y); x.rotate(e.rot);
    if (e.cool < .65 && ['charge', 'spread', 'burst'].includes(e.t.attack)) {
      x.strokeStyle = '#ffb99588'; x.setLineDash([5, 6]); x.lineWidth = 1;
      x.beginPath(); x.arc(0, 0, r + 12 + Math.sin(t * 15) * 3, 0, TAU); x.stroke();
      if (e.t.attack === 'charge') { x.beginPath(); x.moveTo(r, 0); x.lineTo(r + 180, 0); x.stroke(); }
      x.setLineDash([]);
    }
    x.fillStyle = e.flash > 0 ? '#fff' : e.t.color; x.shadowColor = e.t.color; x.shadowBlur = e.boss ? 18 : 7;
    if (kind === 'puffer') { this.star(r * .85, r * 1.3, 12); this.circle(0, 0, r * .9); }
    else if (kind === 'jelly') {
      x.beginPath(); x.arc(0, 0, r, Math.PI, 0); x.quadraticCurveTo(0, r * .5, -r, 0); x.fill();
      x.strokeStyle = e.t.color; x.lineWidth = 3;
      for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * 7, 0); x.quadraticCurveTo(i * 7 + Math.sin(t * 3 + i) * 9, r, i * 6, r * 1.5); x.stroke(); }
    } else {
      const shark = kind === 'shark' || kind === 'leviathan';
      x.beginPath(); x.ellipse(0, 0, r * (shark ? 1.35 : 1), r * .58, 0, 0, TAU); x.fill();
      x.beginPath(); x.moveTo(-r * .7, 0); x.lineTo(-r * 1.55, -r * .7); x.lineTo(-r * 1.4, 0); x.lineTo(-r * 1.55, r * .7); x.closePath(); x.fill();
      if (shark) { x.beginPath(); x.moveTo(-r * .2, 0); x.lineTo(0, -r * 1.1); x.lineTo(r * .5, 0); x.fill(); }
      if (kind === 'angler') { x.strokeStyle = e.t.color; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -r * .5); x.quadraticCurveTo(r, -r * 1.7, r * 1.2, -r); x.stroke(); x.fillStyle = '#f1e6aa'; this.circle(r * 1.2, -r, 4); }
    }
    x.shadowBlur = 0; x.fillStyle = '#10262d'; this.circle(r * .5, -r * .16, e.boss ? 5 : 2.5);
    x.restore();
    if (e.hp < e.maxHp && !e.boss) { x.fillStyle = '#092129'; x.fillRect(e.x - r, e.y - r - 10, r * 2, 3); x.fillStyle = e.t.color; x.fillRect(e.x - r, e.y - r - 10, r * 2 * Math.max(0, e.hp / e.maxHp), 3); }
  }
}
