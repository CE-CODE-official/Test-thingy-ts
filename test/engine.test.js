import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, UPGRADES, segmentHit } from '../public/engine.js';

function fresh() { const game = new Game(1000, 700, () => .5); game.reset(); return game; }
test('pause freezes simulation; resume and reset restore a playable run', () => {
  const g = fresh(); g.update(.03, { x: 1 }); const x = g.player.x, time = g.time;
  g.pause(); g.update(.03, { x: 1 }); assert.equal(g.player.x, x); assert.equal(g.time, time);
  g.resume(); g.update(.03, { x: 1 }); assert.ok(g.player.x > x);
  g.player.hp = 0; g.reset(); assert.equal(g.player.hp, 100); assert.equal(g.enemies.length, 0); assert.equal(g.state, 'playing');
});
test('diagonal movement is normalized and player stays inside the arena', () => {
  const a = fresh(), b = fresh(); a.update(.04, { x: 1 }); b.update(.04, { x: 1, y: 1 });
  assert.ok(Math.abs(Math.hypot(b.player.x - 500, b.player.y - 350) - (a.player.x - 500)) < .001);
  a.player.x = 999; a.update(.04, { x: 1 }); assert.ok(a.player.x <= 978);
});
test('dash grants temporary immunity and cannot bypass its cooldown', () => {
  const g = fresh(); assert.equal(g.dash(), true); g.damage(50); assert.equal(g.player.hp, 100); assert.equal(g.dash(), false);
  g.player.invulnerable = 0; g.damage(10); assert.equal(g.player.hp, 90); g.damage(10); assert.equal(g.player.hp, 90);
});
test('swept projectile collisions catch targets between frames', () => {
  assert.equal(segmentHit({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 3 }, 5), true);
  assert.equal(segmentHit({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 30 }, 5), false);
});
test('depth charge deals real splash damage, without duplicate kills', () => {
  const g = fresh(); g.player.blast = true;
  const a = g.spawn(0), b = g.spawn(0); Object.assign(a, { x: 530, y: 350, hp: 10 }); Object.assign(b, { x: 540, y: 380, hp: 10 });
  g.shoot(0); g.update(.05); assert.equal(g.kills, 2); assert.equal(g.enemies.length, 0);
  g.hit(a, 100); assert.equal(g.kills, 2);
});
test('enemy bullets have readable hitboxes and damage the player', () => {
  const g = fresh(), enemy = g.spawn(2); enemy.x = 460; enemy.y = 350;
  g.enemyShot(enemy, 0, 200); assert.equal(g.shots[0].r, 5);
  for (let i = 0; i < 4; i++) g.update(.03);
  assert.ok(g.player.hp < 100);
});
test('level choices are distinct, capped and cannot unpause through pause controls', () => {
  const g = fresh(); g.upgrades.blast = 1; g.xp = 8; g.update(.01);
  assert.equal(g.state, 'upgrade'); assert.equal(new Set(g.choices.map(u => u.id)).size, 3); assert.ok(g.choices.every(u => u.id !== 'blast'));
  g.resume(); assert.equal(g.state, 'upgrade'); assert.equal(g.pick(9), false);
  const id = g.choices[0].id; assert.equal(g.pick(0), true); assert.equal(g.upgrades[id], 1); assert.equal(g.pick(0), false);
});
test('queued experience produces sequential upgrade selections', () => {
  const g = fresh(); g.xp = 40; g.levelUp(); g.pick(0);
  assert.equal(g.state, 'upgrade'); assert.equal(g.level, 3); assert.equal(g.choices.length, 3);
});
test('every evolution changes the player and max hull repairs correctly', () => {
  for (const upgrade of UPGRADES) { const g = fresh(); g.player.hp = 40; const before = JSON.stringify(g.player); upgrade.apply(g.player); assert.notEqual(JSON.stringify(g.player), before, upgrade.id); }
  const g = fresh(); UPGRADES.find(u => u.id === 'health').apply(g.player); assert.equal(g.player.maxHp, 130); assert.equal(g.player.hp, 130);
});
test('shell salvage repairs hull and collected drops disappear', () => {
  const g = fresh(); g.player.hp = 70; g.shells = 19;
  g.drops.push({ x: 500, y: 350, kind: 'shell', value: 1, life: 10 }); g.update(.01);
  assert.equal(g.player.hp, 78); assert.equal(g.shells, 20); assert.equal(g.drops.length, 0);
});
test('boss milestones spawn once; final kill wins the expedition', () => {
  const g = fresh(); g.time = 90; g.update(.01); assert.equal(g.bossesSpawned, 1);
  g.update(.01); assert.equal(g.enemies.filter(e => e.boss).length, 1);
  g.hit(g.enemies.find(e => e.boss), 10000); assert.equal(g.bossesKilled, 1);
  g.time = 180; g.update(.01); while (g.state === 'upgrade') g.pick(0); g.hit(g.enemies.find(e => e.boss), 10000);
  g.time = 300; g.update(.01); while (g.state === 'upgrade') g.pick(0); const final = g.enemies.find(e => e.final); assert.ok(final);
  g.hit(final, 10000); assert.equal(g.state, 'won'); assert.equal(g.bossesKilled, 3);
});
test('death is terminal and cannot produce repeated end events', () => {
  const g = fresh(); g.damage(1000); assert.equal(g.state, 'dead');
  g.damage(1000); g.end(); assert.equal(g.events.filter(e => e.type === 'end').length, 1);
});
