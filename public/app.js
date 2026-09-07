const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);

let W = 0, H = 0, raf = 0, last = 0;
let running = false, upgradeOpen = false;
let wave = 1, level = 1, time = 0, xp = 0, nextXp = 10, kills = 0, shells = 0;
let spawnClock = 0, shotClock = 0, enemyId = 0;
let particles = [], bullets = [], enemies = [], drops = [], keys = {}, choices = [];
let oceanOffset = 0;

const turtle = new Image();
turtle.src = '/turtle.svg';

const player = {
  x: 0, y: 0, r: 24, hp: 100, maxHp: 100, speed: 255, damage: 20,
  rate: 0.55, shots: 1, projectileSpeed: 680, pierce: 0, magnet: 75,
  armor: 1, explode: false, luck: 0, aim: 0, target: null
};

const upgrades = [
  ['🔱', 'TRIDENT CORE', '+35% harpoon damage.', 'damage', 1.35],
  ['⚡', 'VOLT CURRENT', '+25% fire rate.', 'rate', 0.8],
  ['🫧', 'PRESSURE SUIT', '+30 max HP and heal 30.', 'hp', 30],
  ['🧲', 'SHELL MAGNET', '+80 pickup range.', 'magnet', 80],
  ['🦈', 'PREDATOR INSTINCT', '+20% move speed.', 'speed', 1.2],
  ['☄️', 'DOUBLE BARREL', '+1 harpoon per volley.', 'shots', 1],
  ['💥', 'DEPTH CHARGE', 'Harpoons explode on impact.', 'explode', 1],
  ['🛡️', 'REINFORCED PLATING', 'Take 20% less damage.', 'armor', 0.8],
  ['🎯', 'RAIL HARPOON', '+1 pierce and faster projectiles.', 'pierce', 1],
  ['🐚', 'LUCKY SHELL', 'Better odds of bonus shells.', 'luck', 1]
];

const types = [
  { name: 'MINNOW', kind: 'fish', r: 15, hp: 30, spd: 72, color: '#50e6dc', atk: 'ram', xp: 2, shell: 1 },
  { name: 'PUFFER', kind: 'puffer', r: 19, hp: 60, spd: 42, color: '#f3b84b', atk: 'mine', xp: 3, shell: 2 },
  { name: 'ANGLER', kind: 'angler', r: 18, hp: 55, spd: 48, color: '#b983ff', atk: 'bolt', xp: 4, shell: 2 },
  { name: 'JELLY', kind: 'jelly', r: 23, hp: 105, spd: 30, color: '#ff69b4', atk: 'burst', xp: 6, shell: 3 },
  { name: 'SHARK', kind: 'shark', r: 30, hp: 240, spd: 35, color: '#66a9c8', atk: 'ram', xp: 12, shell: 7 },
  { name: 'LEVIATHAN', kind: 'leviathan', r: 38, hp: 420, spd: 22, color: '#ff4f68', atk: 'burst', xp: 20, shell: 12 }
];

function resize() {
  const d = devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight - 68;
  canvas.width = Math.max(1, Math.floor(W * d));
  canvas.height = Math.max(1, Math.floor(H * d));
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  if (!player.x) { player.x = W / 2; player.y = H / 2; }
  player.x = Math.min(Math.max(player.x, 30), W - 30);
  player.y = Math.min(Math.max(player.y, 30), H - 30);
}
addEventListener('resize', resize);
resize();

addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key.toLowerCase() === 'p' && running) { running = false; toast('PAUSED // PRESS P TO RESUME'); }
  else if (e.key.toLowerCase() === 'p' && !upgradeOpen && $('#start').classList.contains('hidden') && $('#gameover').classList.contains('hidden')) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); toast('RESUMED'); }
});
addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function resetPlayer() {
  Object.assign(player, { x: W / 2, y: H / 2, r: 24, hp: 100, maxHp: 100, speed: 255, damage: 20, rate: 0.55, shots: 1, projectileSpeed: 680, pierce: 0, magnet: 75, armor: 1, explode: false, luck: 0, aim: 0, target: null });
}

function start() {
  running = true; upgradeOpen = false;
  wave = 1; level = 1; time = 0; xp = 0; nextXp = 10; kills = 0; shells = 0;
  spawnClock = 0; shotClock = 0; enemyId = 0; oceanOffset = 0;
  bullets = []; enemies = []; drops = []; particles = [];
  resetPlayer();
  $('#level').textContent = level;
  $('#start').classList.add('hidden'); $('#gameover').classList.add('hidden'); $('#levelup').classList.add('hidden');
  $('#buffs').innerHTML = '';
  toast('DIVE INITIATED // SURVIVE');
  last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
  last = now; time += dt; oceanOffset += dt * 18;
  spawnClock += dt; shotClock += dt;
  const spawnEvery = Math.max(0.22, 0.78 - wave * 0.035);
  if (spawnClock >= spawnEvery) { spawnClock = 0; spawnEnemy(); }
  update(dt); draw(); hud();
  raf = requestAnimationFrame(loop);
}

function spawnEnemy() {
  const poolSize = Math.min(types.length, 1 + Math.floor(wave / 2));
  const bossRoll = Math.random() < Math.min(0.045, wave * 0.0035);
  const t = bossRoll && wave >= 4 ? types[5] : types[Math.floor(Math.random() * poolSize)];
  const edge = Math.floor(Math.random() * 4), pad = 65;
  let x = edge === 0 ? -pad : edge === 1 ? W + pad : Math.random() * W;
  let y = edge === 2 ? -pad : edge === 3 ? H + pad : Math.random() * H;
  const scale = 1 + wave * 0.095;
  enemies.push({ id: ++enemyId, type: t, x, y, r: t.r, hp: t.hp * scale, max: t.hp * scale, spd: t.spd * (1 + wave * 0.012), cool: Math.random() * 2, rot: 0, flash: 0 });
}

function update(dt) {
  let dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  let dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  if (dx || dy) { player.x += dx / len * player.speed * dt; player.y += dy / len * player.speed * dt; }
  player.x = Math.max(24, Math.min(W - 24, player.x));
  player.y = Math.max(24, Math.min(H - 24, player.y));

  player.target = nearestEnemy();
  if (player.target) player.aim = Math.atan2(player.target.y - player.y, player.target.x - player.x);
  if (player.target && shotClock >= player.rate) { shotClock = 0; shoot(player.target); }

  for (const e of enemies) {
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    e.rot = a; e.cool -= dt; e.flash = Math.max(0, e.flash - dt);
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist > e.r + player.r + 8) { e.x += Math.cos(a) * e.spd * dt; e.y += Math.sin(a) * e.spd * dt; }
    if (e.type.atk === 'mine' && e.cool <= 0) { e.cool = 3; drops.push({ x: e.x, y: e.y, r: 10, kind: 'mine', life: 8 }); }
    if (e.type.atk === 'bolt' && e.cool <= 0) { e.cool = 2.1; enemyShot(e.x, e.y, a, 250, 7); }
    if (e.type.atk === 'burst' && e.cool <= 0) { e.cool = 3.2; for (let i = 0; i < 10; i++) enemyShot(e.x, e.y, i * Math.PI * 2 / 10, 165, 5); }
    if (dist < e.r + player.r) { damage(13 * dt); e.x -= Math.cos(a) * 60 * dt; e.y -= Math.sin(a) * 60 * dt; }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let remove = false;
    if (b.enemy && Math.hypot(b.x - player.x, b.y - player.y) < b.r + player.r) { damage(b.damage); remove = true; }
    if (!b.enemy) {
      for (const e of enemies) {
        if (b.hitIds.has(e.id)) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
          b.hitIds.add(e.id); e.hp -= player.damage; e.flash = 0.09;
          if (player.explode) burst(e.x, e.y, 14, 105);
          if (e.hp <= 0) kill(e);
          b.pierceLeft -= 1;
          if (b.pierceLeft < 0) remove = true;
          break;
        }
      }
    }
    if (remove || b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) bullets.splice(i, 1);
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]; d.life -= dt;
    if (d.kind === 'mine') {
      const near = Math.hypot(d.x - player.x, d.y - player.y);
      if (near < d.r + player.r) { burst(d.x, d.y, 28, 150); damage(30); drops.splice(i, 1); }
    } else {
      const near = Math.hypot(d.x - player.x, d.y - player.y);
      if (near < player.magnet) { shells++; burst(d.x, d.y, 5, 55); drops.splice(i, 1); }
    }
    if (d.life <= 0 && drops[i] === d) drops.splice(i, 1);
  }
  particles = particles.filter(p => (p.life -= dt) > 0);
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }
}

function nearestEnemy() {
  let best = null, bestD = Infinity;
  for (const e of enemies) { const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2; if (d < bestD) { bestD = d; best = e; } }
  return best;
}

function enemyShot(x, y, a, speed, damageValue) {
  bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, enemy: true, damage: damageValue, life: 4, hitIds: new Set(), pierceLeft: 0 });
}

function shoot(target) {
  for (let i = 0; i < player.shots; i++) {
    const spread = (i - (player.shots - 1) / 2) * 0.11;
    const a = Math.atan2(target.y - player.y, target.x - player.x) + spread;
    bullets.push({ x: player.x + Math.cos(a) * 18, y: player.y + Math.sin(a) * 18, vx: Math.cos(a) * player.projectileSpeed, vy: Math.sin(a) * player.projectileSpeed, r: 4, enemy: false, life: 1.6, hitIds: new Set(), pierceLeft: player.pierce });
  }
  burst(player.x + Math.cos(player.aim) * 22, player.y + Math.sin(player.aim) * 22, 4, 35);
}

function kill(e) {
  const idx = enemies.indexOf(e); if (idx < 0) return;
  enemies.splice(idx, 1); kills++; gainXp(e.type.xp);
  const count = e.type.shell + (Math.random() < 0.15 + player.luck * 0.1 ? 1 : 0);
  for (let i = 0; i < count; i++) drops.push({ x: e.x + (Math.random() - 0.5) * 28, y: e.y + (Math.random() - 0.5) * 28, r: 6, kind: 'shell', life: 20 });
  burst(e.x, e.y, e.type.kind === 'shark' || e.type.kind === 'leviathan' ? 35 : 18, 190);
}

function gainXp(amount) {
  xp += amount;
  if (xp >= nextXp) {
    xp -= nextXp; nextXp = Math.floor(nextXp * 1.28 + 4); level++; $('#level').textContent = level;
    openUpgrade();
  }
}

function openUpgrade() {
  running = false; upgradeOpen = true;
  choices = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
  $('#choices').innerHTML = choices.map((u, i) => `<button type="button" class="choice" data-i="${i}"><div class="icon">${u[0]}</div><strong>${u[1]}</strong><p>${u[2]}</p><span>INSTALL →</span></button>`).join('');
  $('#choices').querySelectorAll('.choice').forEach((button) => button.addEventListener('click', () => pick(Number(button.dataset.i)), { once: true }));
  $('#levelup').classList.remove('hidden');
  toast('EVOLUTION AVAILABLE // CHOOSE ONE');
}

function pick(i) {
  if (!upgradeOpen || !choices[i]) return;
  const u = choices[i];
  if (u[3] === 'damage') player.damage *= u[4];
  if (u[3] === 'rate') player.rate *= u[4];
  if (u[3] === 'hp') { player.maxHp += u[4]; player.hp = Math.min(player.maxHp, player.hp + u[4]); }
  if (u[3] === 'magnet') player.magnet += u[4];
  if (u[3] === 'speed') player.speed *= u[4];
  if (u[3] === 'shots') player.shots++;
  if (u[3] === 'explode') player.explode = true;
  if (u[3] === 'armor') player.armor *= u[4];
  if (u[3] === 'pierce') { player.pierce++; player.projectileSpeed *= 1.12; }
  if (u[3] === 'luck') player.luck++;
  const tag = document.createElement('span'); tag.textContent = `${u[0]} ${u[1]}`; $('#buffs').appendChild(tag);
  upgradeOpen = false; $('#levelup').classList.add('hidden');
  last = performance.now(); running = true; toast(`UPGRADE INSTALLED // ${u[1]}`); raf = requestAnimationFrame(loop);
}

function damage(amount) {
  player.hp -= amount * player.armor;
  burst(player.x, player.y, 7, 70);
  if (player.hp <= 0) die();
}

function die() {
  running = false; upgradeOpen = false;
  $('#finalWave').textContent = `WAVE ${wave}`; $('#finalKills').textContent = `${kills} CREATURES`; $('#finalShells').textContent = `${shells} SHELLS`;
  $('#gameover').classList.remove('hidden'); saveBest();
}

function saveBest() { fetch('/api/score', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: kills }) }).catch(() => {}); }

function burst(x, y, n, speed = 120) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = speed * (0.25 + Math.random() * 0.75); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.25 + Math.random() * 0.5, r: 1 + Math.random() * 3 }); } }
function toast(text) { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 1500); }

function hud() {
  const sec = Math.floor(time % 60), min = Math.floor(time / 60);
  $('#time').textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  $('#wave').textContent = wave; $('#xp').textContent = `${xp}/${nextXp}`; $('#shells').textContent = shells;
  $('#hpText').textContent = `${Math.ceil(Math.max(0, player.hp))} / ${player.maxHp}`; $('#hpBar').style.width = `${Math.max(0, player.hp / player.maxHp * 100)}%`;
  if (time >= wave * 32) { wave++; toast(`DEPTH ${wave} // NEW CREATURES`); }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a3142'); g.addColorStop(0.5, '#062231'); g.addColorStop(1, '#03141f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  drawWaves(); drawBubbles();
  for (const d of drops) drawDrop(d);
  for (const b of bullets) drawBullet(b);
  for (const e of enemies) drawEnemy(e);
  drawPlayer();
  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = '#a8f8ff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
}

function drawWaves() {
  ctx.lineWidth = 1.2;
  for (let row = -1; row < 10; row++) {
    const y0 = ((row * 105 + oceanOffset * (row % 2 ? 0.35 : -0.22)) % (H + 130)) - 65;
    ctx.beginPath();
    for (let x = -40; x <= W + 40; x += 12) { const y = y0 + Math.sin(x * 0.015 + row * 1.7 + oceanOffset * 0.015) * 10; if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.strokeStyle = row % 2 ? 'rgba(52,176,196,.12)' : 'rgba(102,221,226,.08)'; ctx.stroke();
    ctx.beginPath();
    for (let x = -40; x <= W + 40; x += 18) { const y = y0 + 24 + Math.sin(x * 0.012 - row + oceanOffset * 0.01) * 7; if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.strokeStyle = 'rgba(21,118,145,.12)'; ctx.stroke();
  }
}

function drawBubbles() {
  for (let i = 0; i < 28; i++) { const x = (i * 173 + 47) % W; const y = (i * 91 + oceanOffset * (0.8 + (i % 4) * 0.15)) % H; const r = 1 + (i % 4) * 0.7; ctx.strokeStyle = 'rgba(155,239,247,.18)'; ctx.beginPath(); ctx.arc(x, H - y, r, 0, Math.PI * 2); ctx.stroke(); }
}

function drawPlayer() {
  ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.aim || 0);
  ctx.shadowBlur = 24; ctx.shadowColor = '#39e8ff';
  if (turtle.complete && turtle.naturalWidth) ctx.drawImage(turtle, -30, -30, 60, 60);
  else drawTurtleFallback();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(215,253,255,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(27, 0); ctx.lineTo(43, 0); ctx.stroke();
  ctx.restore();
}

function drawTurtleFallback() {
  ctx.fillStyle = '#34e1bf'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#0d6570'; ctx.beginPath(); ctx.arc(19, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7cf6d7'; for (const [x, y] of [[-10, -14], [-10, 14], [8, -12], [8, 12]]) { ctx.beginPath(); ctx.ellipse(x, y, 6, 10, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#0b2730'; ctx.beginPath(); ctx.arc(22, -3, 1.8, 0, Math.PI * 2); ctx.fill();
}

function drawEnemy(e) {
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.shadowBlur = 18; ctx.shadowColor = e.type.color; ctx.fillStyle = e.flash ? '#ffffff' : e.type.color;
  const r = e.r;
  if (e.type.kind === 'fish' || e.type.kind === 'angler') drawFish(r, e.type.kind === 'angler');
  else if (e.type.kind === 'shark' || e.type.kind === 'leviathan') drawShark(r, e.type.kind === 'leviathan');
  else if (e.type.kind === 'puffer') drawPuffer(r);
  else drawJelly(r);
  ctx.restore();
  if (e.hp < e.max) { ctx.fillStyle = 'rgba(0,18,27,.75)'; ctx.fillRect(e.x - e.r, e.y - e.r - 11, e.r * 2, 4); ctx.fillStyle = e.type.color; ctx.fillRect(e.x - e.r, e.y - e.r - 11, e.r * 2 * Math.max(0, e.hp / e.max), 4); }
}

function drawFish(r, angler) {
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 0.68, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * .8, 0); ctx.lineTo(-r * 1.55, -r * .75); ctx.lineTo(-r * 1.55, r * .75); ctx.closePath(); ctx.fill();
  if (angler) { ctx.strokeStyle = '#e8b6ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * .1, -r * .5); ctx.quadraticCurveTo(r * .3, -r * 1.5, r * .8, -r * .9); ctx.stroke(); ctx.fillStyle = '#fff18a'; ctx.beginPath(); ctx.arc(r * .8, -r * .9, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#06131a'; ctx.beginPath(); ctx.arc(r * .5, -r * .22, 2.8, 0, Math.PI * 2); ctx.fill();
}

function drawShark(r, boss) {
  ctx.beginPath(); ctx.moveTo(r * 1.55, 0); ctx.lineTo(-r * .85, -r * .62); ctx.lineTo(-r * .5, 0); ctx.lineTo(-r * .85, r * .62); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * .25, -r * .4); ctx.lineTo(-r * .1, -r * 1.05); ctx.lineTo(r * .2, -.35 * r); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e9fbff'; ctx.beginPath(); ctx.arc(r * .62, -r * .2, 3, 0, Math.PI * 2); ctx.fill();
  if (boss) { ctx.strokeStyle = '#ffced5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, Math.PI * 2); ctx.stroke(); }
}

function drawPuffer(r) {
  ctx.beginPath(); ctx.arc(0, 0, r * .85, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 12; i++) { const a = i * Math.PI * 2 / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .65, Math.sin(a) * r * .65); ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); ctx.strokeStyle = '#f8d47a'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.fillStyle = '#08141b'; ctx.beginPath(); ctx.arc(r * .35, -r * .25, 3, 0, Math.PI * 2); ctx.arc(r * .35, r * .25, 3, 0, Math.PI * 2); ctx.fill();
}

function drawJelly(r) {
  ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.lineTo(r, r * .55); ctx.quadraticCurveTo(r * .55, r * .15, 0, r * .6); ctx.quadraticCurveTo(-r * .55, r * .15, -r, r * .55); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffd0e9'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * .4, r * .35); ctx.quadraticCurveTo(i * r * .5, r * .8, i * r * .35, r * 1.2); ctx.stroke(); }
}

function drawBullet(b) {
  ctx.save(); ctx.strokeStyle = b.enemy ? '#ff6578' : '#c5fbff'; ctx.lineWidth = b.enemy ? 4 : 3; ctx.shadowBlur = 10; ctx.shadowColor = ctx.strokeStyle;
  ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .028, b.y - b.vy * .028); ctx.stroke(); ctx.restore();
}

function drawDrop(d) {
  ctx.save(); ctx.translate(d.x, d.y); ctx.shadowBlur = 14; ctx.shadowColor = d.kind === 'mine' ? '#ff536d' : '#ffe37c';
  if (d.kind === 'mine') { ctx.fillStyle = '#ff536d'; ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.strokeStyle = '#ff9aaa'; ctx.beginPath(); ctx.moveTo(Math.cos(a) * d.r, Math.sin(a) * d.r); ctx.lineTo(Math.cos(a) * (d.r + 5), Math.sin(a) * (d.r + 5)); ctx.stroke(); } }
  else { ctx.fillStyle = '#ffe37c'; ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#7d5b20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, d.r * .65, Math.PI * .15, Math.PI * 1.7); ctx.stroke(); }
  ctx.restore();
}

$('#startBtn').onclick = start;
$('#restartBtn').onclick = start;
