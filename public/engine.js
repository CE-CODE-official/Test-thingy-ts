// DOM-free simulation: the same rules run in the browser and in regression tests.
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const UPGRADES = [
  { id: 'damage', icon: '↗', name: 'Trident core', text: '+35% harpoon damage.', max: 8, apply: p => p.damage *= 1.35 },
  { id: 'rate', icon: 'ϟ', name: 'Volt current', text: 'Fire 20% faster.', max: 6, apply: p => p.rate *= .8 },
  { id: 'health', icon: '✚', name: 'Pressure suit', text: '+30 maximum hull. Repair 50 hull.', max: 8, apply: p => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 50); } },
  { id: 'magnet', icon: '◎', name: 'Shell magnet', text: '+65 shell pickup range.', max: 4, apply: p => p.magnet += 65 },
  { id: 'speed', icon: '»', name: 'Slipstream', text: '+15% swim speed. Dash recharges faster.', max: 4, apply: p => { p.speed *= 1.15; p.dashMax *= .85; } },
  { id: 'multi', icon: '⋔', name: 'Triple threat', text: '+2 harpoons in every volley.', max: 3, apply: p => p.multishot += 2 },
  { id: 'blast', icon: '◉', name: 'Depth charge', text: 'Hits deal 50% splash damage nearby.', max: 1, apply: p => p.blast = true },
  { id: 'armor', icon: '⬡', name: 'Reef plating', text: 'Take 18% less damage.', max: 4, apply: p => p.armor *= .82 },
  { id: 'pierce', icon: '⤳', name: 'Rail harpoon', text: 'Harpoons pierce one more creature.', max: 4, apply: p => p.pierce++ },
  { id: 'orbit', icon: '✳', name: 'Tidal satellites', text: 'Add an orbiting blade that damages enemies.', max: 3, apply: p => p.orbits++ },
  { id: 'regen', icon: '⟳', name: 'Living shell', text: 'Regenerate 1 hull every second.', max: 3, apply: p => p.regen++ },
];
export const CREATURES = [
  { name: 'Minnow', kind: 'fish', r: 13, hp: 28, speed: 64, color: '#7ccfc2', attack: 'dart', damage: 7, xp: 1, shells: 1, cool: 3.5 },
  { name: 'Puffer', kind: 'puffer', r: 20, hp: 70, speed: 38, color: '#edc46d', attack: 'mine', damage: 16, xp: 3, shells: 3, cool: 4 },
  { name: 'Angler', kind: 'angler', r: 18, hp: 58, speed: 48, color: '#b59cde', attack: 'bolt', damage: 10, xp: 3, shells: 3, cool: 2.8 },
  { name: 'Jelly', kind: 'jelly', r: 23, hp: 95, speed: 32, color: '#f1a0b8', attack: 'burst', damage: 9, xp: 4, shells: 4, cool: 4.5 },
  { name: 'Shark', kind: 'shark', r: 29, hp: 175, speed: 53, color: '#8caecd', attack: 'charge', damage: 18, xp: 7, shells: 6, cool: 4 },
  { name: 'Leviathan', kind: 'leviathan', r: 52, hp: 1600, speed: 32, color: '#ff8b7e', attack: 'spread', damage: 17, xp: 22, shells: 25, cool: 2.8 },
];

export class Game {
  constructor(width = 1100, height = 700, random = Math.random) {
    this.width = width; this.height = height; this.random = random;
    this.state = 'menu'; this.reset(); this.state = 'menu';
  }
  reset() {
    this.player = { x: this.width / 2, y: this.height / 2, r: 18, hp: 100, maxHp: 100,
      speed: 225, damage: 24, rate: .55, multishot: 1, pierce: 0, magnet: 90, armor: 1,
      blast: false, orbits: 0, regen: 0, aim: 0, moveAngle: -Math.PI / 2,
      dash: 0, dashCooldown: 0, dashMax: 3.5, invulnerable: 0 };
    this.time = 0; this.wave = 1; this.level = 1; this.xp = 0; this.nextXp = 8;
    this.kills = 0; this.shells = 0; this.spawnClock = .5; this.shotClock = .4;
    this.enemies = []; this.shots = []; this.drops = []; this.particles = []; this.rings = [];
    this.events = []; this.upgrades = {}; this.choices = []; this.bossesSpawned = 0;
    this.bossesKilled = 0; this.id = 0; this.shake = 0; this.state = 'playing';
  }
  resize(w, h) {
    this.width = w; this.height = h;
    this.player.x = clamp(this.player.x, 22, w - 22);
    this.player.y = clamp(this.player.y, 22, h - 22);
  }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  pause() { if (this.state === 'playing') { this.state = 'paused'; this.emit('state'); } }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.emit('state'); } }
  dash() {
    const p = this.player;
    if (this.state !== 'playing' || p.dashCooldown > 0) return false;
    p.dash = .23; p.invulnerable = .36; p.dashCooldown = p.dashMax;
    this.burst(p.x, p.y, 15, '#d3ed8b'); this.emit('dash'); return true;
  }
  update(dt, input = {}) {
    if (this.state !== 'playing') return;
    dt = clamp(dt, 0, .05);
    const p = this.player;
    this.time += dt; this.wave = 1 + Math.floor(this.time / 30);
    this.shake = Math.max(0, this.shake - dt * 22);
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    let dx = input.x || 0, dy = input.y || 0;
    const len = Math.max(1, Math.hypot(dx, dy)); dx /= len; dy /= len;
    if (dx || dy) p.moveAngle = Math.atan2(dy, dx);
    if (p.dash > 0) { dx = Math.cos(p.moveAngle) * 3.3; dy = Math.sin(p.moveAngle) * 3.3; p.dash -= dt; this.burst(p.x, p.y, 2, '#d3ed8b'); }
    p.x = clamp(p.x + dx * p.speed * dt, p.r + 4, this.width - p.r - 4);
    p.y = clamp(p.y + dy * p.speed * dt, p.r + 4, this.height - p.r - 4);
    const milestone = [90, 180, 300][this.bossesSpawned];
    if (milestone && this.time >= milestone && !this.enemies.some(e => e.boss)) {
      this.spawn(5, true); this.bossesSpawned++;
      this.emit('toast', { text: this.bossesSpawned === 3 ? 'THE LEVIATHAN · FINAL CONTACT' : 'LARGE SIGNATURE DETECTED · GUARDIAN APPROACHING' });
    }
    this.spawnClock += dt;
    if (this.spawnClock > Math.max(.3, 1.15 - this.wave * .065)) {
      this.spawnClock = 0;
      if (this.enemies.length < 48) {
        const max = Math.min(5, 1 + Math.floor(this.wave / 2));
        this.spawn(this.random() < .42 ? 0 : Math.floor(this.random() * max));
      }
    }
    this.shotClock += dt;
    const target = this.enemies.reduce((best, e) => !best || distance(e, p) < distance(best, p) ? e : best, null);
    if (target) { p.aim = Math.atan2(target.y - p.y, target.x - p.x); if (this.shotClock >= p.rate) { this.shotClock = 0; this.shoot(p.aim); } }
    for (const e of [...this.enemies]) {
      const a = Math.atan2(p.y - e.y, p.x - e.x), d = distance(e, p);
      e.flash = Math.max(0, e.flash - dt); e.cool -= dt;
      if (e.charging > 0) { e.charging -= dt; e.x += Math.cos(e.chargeAngle) * 330 * dt; e.y += Math.sin(e.chargeAngle) * 330 * dt; }
      else { e.rot = a; const speed = e.cool < .6 && e.t.attack === 'charge' ? 0 : e.speed; e.x += Math.cos(a) * speed * dt; e.y += Math.sin(a) * speed * dt; }
      if (d < p.r + e.r) this.damage(e.t.damage);
      if (e.cool <= 0) { e.cool = e.t.cool; this.attack(e, a, d); }
      if (p.orbits) for (let i = 0; i < p.orbits; i++) {
        const angle = this.time * 2.8 + i * TAU / p.orbits;
        if (distance(e, { x: p.x + Math.cos(angle) * 72, y: p.y + Math.sin(angle) * 72 }) < e.r + 12) this.hit(e, p.damage * 2 * dt);
      }
      if (this.state !== 'playing') return;
    }
    for (const b of this.shots) {
      const old = { x: b.x, y: b.y };
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.enemy) { if (segmentHit(old, b, p, b.r + p.r)) { this.damage(b.damage); b.life = 0; } }
      else for (const e of [...this.enemies]) {
        if (b.hit.has(e.id) || !segmentHit(old, b, e, e.r + b.r)) continue;
        b.hit.add(e.id); this.hit(e, b.damage);
        if (p.blast) {
          this.rings.push({ x: e.x, y: e.y, r: 65, life: .3, color: '#f1c876' });
          for (const other of [...this.enemies]) if (other !== e && distance(other, e) < 65 + other.r) this.hit(other, b.damage * .5);
        }
        if (--b.pierce < 0) { b.life = 0; break; }
      }
      if (this.state !== 'playing') return;
    }
    this.shots = this.shots.filter(b => b.life > 0 && b.x > -100 && b.y > -100 && b.x < this.width + 100 && b.y < this.height + 100);
    for (const d of this.drops) {
      d.life -= dt;
      const dist = distance(d, p);
      if (d.kind === 'mine') { if (d.life < 7.3 && dist < p.r + 13) { this.damage(18); d.life = 0; this.burst(d.x, d.y, 16, '#f1c876'); } }
      else {
        if (dist < p.magnet) { const a = Math.atan2(p.y - d.y, p.x - d.x); d.x += Math.cos(a) * 340 * dt; d.y += Math.sin(a) * 340 * dt; }
        if (dist < p.r + 10) {
          const old = this.shells; this.shells += d.value; d.life = 0;
          if (Math.floor(old / 20) < Math.floor(this.shells / 20)) { p.hp = Math.min(p.maxHp, p.hp + 8); this.emit('toast', { text: 'SHELL SALVAGE · +8 HULL' }); }
          this.emit('pickup'); this.burst(d.x, d.y, 3, '#f1c876');
        }
      }
    }
    this.drops = this.drops.filter(d => d.life > 0);
    this.updateEffects(dt);
    if (this.state === 'playing' && this.xp >= this.nextXp) this.levelUp();
  }
  updateEffects(dt) {
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter(r => r.life > 0);
  }
  spawn(index, boss = false) {
    const t = CREATURES[index], side = Math.floor(this.random() * 4), pad = 55;
    const x = side === 0 ? -pad : side === 1 ? this.width + pad : this.random() * this.width;
    const y = side === 2 ? -pad : side === 3 ? this.height + pad : this.random() * this.height;
    const scale = boss ? [.65, 1.15, 2][this.bossesSpawned] : 1 + (this.wave - 1) * .12;
    const e = { id: ++this.id, t, x, y, r: t.r, hp: t.hp * scale, maxHp: t.hp * scale,
      speed: t.speed * (1 + this.wave * .012), cool: t.cool, rot: 0, flash: 0, charging: 0, chargeAngle: 0, boss, final: boss && this.bossesSpawned === 2 };
    this.enemies.push(e); return e;
  }
  shoot(a) {
    const p = this.player;
    for (let i = 0; i < p.multishot; i++) {
      const angle = a + (i - (p.multishot - 1) / 2) * .14;
      this.shots.push({ x: p.x, y: p.y, vx: Math.cos(angle) * 630, vy: Math.sin(angle) * 630,
        r: 4, damage: p.damage, enemy: false, life: 1.6, pierce: p.pierce, hit: new Set() });
    }
    this.emit('shoot');
  }
  enemyShot(e, a, speed = 170) {
    if (this.shots.length >= 450) return;
    this.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5,
      damage: e.t.damage, enemy: true, life: 5 });
  }
  attack(e, a, d) {
    if (e.x < 0 || e.y < 0 || e.x > this.width || e.y > this.height) return;
    switch (e.t.attack) {
      case 'dart': if (d < 370) this.enemyShot(e, a, 155); break;
      case 'bolt': this.enemyShot(e, a, 210); break;
      case 'mine': this.drops.push({ x: e.x, y: e.y, kind: 'mine', life: 8 }); break;
      case 'burst': for (let i = 0; i < 10; i++) this.enemyShot(e, i * TAU / 10, 115); break;
      case 'charge': e.charging = .65; e.chargeAngle = a; break;
      case 'spread':
        for (let i = -3; i <= 3; i++) this.enemyShot(e, a + i * .22, 150);
        if (e.hp < e.maxHp / 2) for (let i = 0; i < 12; i++) this.enemyShot(e, i * TAU / 12 + this.time, 105);
        break;
    }
  }
  hit(e, amount) {
    if (!this.enemies.includes(e)) return;
    e.hp -= amount; e.flash = .08;
    if (e.hp > 0) return;
    this.enemies.splice(this.enemies.indexOf(e), 1); this.kills++; this.xp += e.t.xp;
    this.drops.push({ x: e.x, y: e.y, kind: 'shell', value: e.t.shells, life: 24 });
    this.burst(e.x, e.y, e.boss ? 50 : 12, e.t.color); this.emit('kill');
    if (e.boss) {
      this.bossesKilled++; this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
      this.shots = this.shots.filter(b => !b.enemy);
      this.emit('toast', { text: 'GUARDIAN DEFEATED · +35 HULL · KEEP DESCENDING' });
      if (e.final) this.end(true);
    }
  }
  damage(amount) {
    const p = this.player;
    if (this.state !== 'playing' || p.invulnerable > 0) return;
    p.hp = Math.max(0, p.hp - amount * p.armor); p.invulnerable = .65; this.shake = 6;
    this.burst(p.x, p.y, 12, '#ff8b7e'); this.emit('hurt');
    if (p.hp <= 0) this.end(false);
  }
  levelUp() {
    this.xp -= this.nextXp; this.nextXp = Math.floor(this.nextXp * 1.18 + 3); this.level++;
    const pool = UPGRADES.filter(u => (this.upgrades[u.id] || 0) < u.max);
    // Fisher–Yates gives every eligible evolution an equal chance.
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    this.choices = pool.slice(0, 3);
    if (!this.choices.length) { this.player.hp = this.player.maxHp; return; }
    this.state = 'upgrade'; this.emit('upgrade');
  }
  pick(index) {
    if (this.state !== 'upgrade' || !this.choices[index]) return false;
    const u = this.choices[index]; u.apply(this.player); this.upgrades[u.id] = (this.upgrades[u.id] || 0) + 1;
    this.choices = []; this.state = 'playing'; this.emit('state'); this.emit('toast', { text: `EVOLUTION INSTALLED · ${u.name.toUpperCase()}` });
    if (this.xp >= this.nextXp) this.levelUp();
    return true;
  }
  end(won = false) {
    if (!['playing', 'paused'].includes(this.state)) return;
    this.state = won ? 'won' : 'dead'; this.emit('end', { won });
  }
  burst(x, y, count, color) {
    for (let i = 0; i < count && this.particles.length < 450; i++) {
      const a = this.random() * TAU, speed = 30 + this.random() * 140;
      this.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .25 + this.random() * .4, color, r: 1 + this.random() * 2 });
    }
  }
}

// Swept collision prevents fast harpoons from tunneling through small enemies.
export function segmentHit(a, b, target, radius) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length ? clamp(((target.x - a.x) * dx + (target.y - a.y) * dy) / length, 0, 1) : 0;
  return Math.hypot(a.x + dx * t - target.x, a.y + dy * t - target.y) <= radius;
}
