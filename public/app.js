import { Game, UPGRADES, clamp } from './engine.js';
import { Renderer } from './render.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#game'), main = $('main');
const game = new Game(), renderer = new Renderer(canvas);
const keys = new Set();
let pointer = null, stick = { x: 0, y: 0 }, last = performance.now(), clock = 0, lastState = '', lastZone = 0;
let audio, muted = true, lastTone = 0, toastTimer;
let record = { kills: 0, time: 0, wins: 0, runs: 0 };
try {
  const saved = JSON.parse(localStorage.getItem('abyss-record') || '{}');
  for (const key of Object.keys(record)) if (Number.isFinite(saved[key]) && saved[key] >= 0) record[key] = saved[key];
  muted = localStorage.getItem('abyss-muted') !== 'false';
} catch { /* Private browsing can disable storage. The game remains playable. */ }
const formatTime = time => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
function save() { try { localStorage.setItem('abyss-record', JSON.stringify(record)); localStorage.setItem('abyss-muted', String(muted)); } catch { /* Optional persistence. */ } }
function resize() { const { width, height } = main.getBoundingClientRect(); game.resize(width, height); renderer.resize(width, height); }
new ResizeObserver(resize).observe(main); resize();

function tone(kind) {
  if (muted) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const now = audio.currentTime;
    if (now - lastTone < .045 && ['shoot', 'pickup', 'kill'].includes(kind)) return;
    lastTone = now;
    const presets = { shoot: [420, 150, .06, .018], pickup: [800, 1200, .08, .025], kill: [160, 60, .12, .025], hurt: [100, 35, .2, .05], dash: [180, 650, .18, .03], upgrade: [400, 1000, .35, .04], end: [250, 60, .7, .035] };
    const [from, to, duration, volume] = presets[kind] || presets.pickup;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = kind === 'hurt' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + duration);
  } catch { /* Audio is optional on unsupported devices. */ }
}
function syncSound() { $('#soundBtn').textContent = muted ? 'SOUND OFF' : 'SOUND ON'; $('#soundBtn').setAttribute('aria-pressed', String(!muted)); $('#soundBtn').setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound'); }
$('#soundBtn').onclick = () => { muted = !muted; syncSound(); save(); tone('pickup'); };
syncSound();
function toast(text) { $('#toast').textContent = text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2700); }
function clearInput() { keys.clear(); pointer = null; stick = { x: 0, y: 0 }; $('#joystick').classList.add('hidden'); }
function start() { clearInput(); game.reset(); lastZone = 0; tone('dash'); toast('DIVE INITIATED · MOVE TO EVADE · SPACE TO DASH'); sync(); }
$('#startBtn').onclick = start; $('#restartBtn').onclick = start;
$('#resumeBtn').onclick = () => { clearInput(); game.resume(); sync(); };
$('#quitBtn').onclick = () => { game.end(); processEvents(); sync(); };
$('#menuBtn').onclick = () => { game.state = 'menu'; clearInput(); sync(); };
function togglePause() { clearInput(); if (game.state === 'playing') game.pause(); else game.resume(); sync(); }
$('#pauseBtn').onclick = togglePause;
$('#dashBtn').onpointerdown = e => { e.preventDefault(); game.dash(); };

addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key) && game.state === 'playing') e.preventDefault();
  if (e.repeat) return;
  keys.add(key);
  if (key === 'escape' || key === 'p') togglePause();
  if (key === ' ' && game.state === 'playing') game.dash();
  if (game.state === 'upgrade' && ['1', '2', '3'].includes(key)) { game.pick(Number(key) - 1); sync(); }
  if (key === 'Tab' && ['upgrade', 'paused', 'dead', 'won'].includes(game.state)) {
    const overlay = $('.overlay:not(.hidden)'), buttons = [...overlay.querySelectorAll('button')];
    if (buttons.length && (e.shiftKey ? document.activeElement === buttons[0] : document.activeElement === buttons.at(-1))) { e.preventDefault(); (e.shiftKey ? buttons.at(-1) : buttons[0]).focus(); }
  }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => { clearInput(); game.pause(); sync(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); game.pause(); sync(); } last = performance.now(); });
canvas.addEventListener('pointerdown', e => {
  if (game.state !== 'playing' || pointer) return;
  const rect = canvas.getBoundingClientRect();
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  $('#joystick').style.left = `${e.clientX - rect.left - 48}px`; $('#joystick').style.top = `${e.clientY - rect.top - 48}px`;
  $('#joystick i').style.transform = ''; $('#joystick').classList.remove('hidden');
});
canvas.addEventListener('pointermove', e => {
  if (!pointer || pointer.id !== e.pointerId) return;
  const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y, len = Math.max(40, Math.hypot(dx, dy));
  stick = { x: dx / len, y: dy / len }; $('#joystick i').style.transform = `translate(${stick.x * 30}px,${stick.y * 30}px)`;
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, e => { if (pointer?.id === e.pointerId) clearInput(); });

function sync() {
  const state = game.state;
  for (const [id, show] of Object.entries({ start: state === 'menu', levelup: state === 'upgrade', pause: state === 'paused', gameover: ['dead', 'won'].includes(state), gameHud: state !== 'menu' })) $(`#${id}`).classList.toggle('hidden', !show);
  $('#pauseBtn').disabled = !['playing', 'paused'].includes(state);
  $('#pauseBtn').textContent = state === 'paused' ? '▷' : 'Ⅱ';
  $('#pauseBtn').setAttribute('aria-label', state === 'paused' ? 'Resume game' : 'Pause game');
  $('#signal').textContent = { menu: 'STANDING BY', playing: 'SIGNAL ACTIVE', paused: 'HOLDING POSITION', upgrade: 'EVOLVING', won: 'MISSION COMPLETE', dead: 'SIGNAL LOST' }[state];
  $('#best').textContent = record.runs ? `${record.kills} KILLS / ${formatTime(record.time)} / ${record.wins} WINS` : 'NO DIVES YET';
  $('#buffs').innerHTML = UPGRADES.filter(u => game.upgrades[u.id]).map(u => `<span title="${u.name}: ${game.upgrades[u.id]}" aria-label="${u.name}: ${game.upgrades[u.id]}">${u.icon} ${game.upgrades[u.id]}</span>`).join('');
  if (state !== lastState) {
    clearInput(); lastState = state;
    const focus = { menu: '#startBtn', paused: '#resumeBtn', dead: '#restartBtn', won: '#restartBtn' }[state];
    if (focus) $(focus).focus({ preventScroll: true });
    if (state === 'playing') document.activeElement?.blur();
  }
}
function showChoices() {
  $('#choices').innerHTML = game.choices.map((u, i) => `<button class="choice" data-index="${i}"><span class="slot">0${i + 1}</span><div class="icon">${u.icon}</div><strong>${u.name}</strong><p>${u.text}</p><span class="install">INSTALL EVOLUTION →</span></button>`).join('');
  $('#choices').querySelectorAll('button').forEach(button => button.onclick = () => { game.pick(Number(button.dataset.index)); processEvents(); sync(); });
  sync(); $('#choices button')?.focus({ preventScroll: true });
}
function processEvents() {
  for (const event of game.events.splice(0)) {
    if (event.type === 'toast') toast(event.text);
    else if (event.type === 'upgrade') { tone('upgrade'); showChoices(); }
    else if (event.type === 'end') {
      tone('end');
      const best = game.kills > record.kills;
      record.kills = Math.max(record.kills, game.kills); record.time = Math.max(record.time, Math.floor(game.time)); record.runs++; if (event.won) record.wins++;
      save();
      $('#endEyebrow').textContent = event.won ? 'LEVIATHAN DEFEATED · MISSION COMPLETE' : 'SIGNAL LOST · EXPEDITION ENDED';
      $('#endTitle').innerHTML = event.won ? 'Small turtle.<br><em>Big legend.</em>' : 'The ocean <em>remembers.</em>';
      $('#endCopy').textContent = event.won ? 'You faced the deepest dark. And swam back.' : 'A new build. A different route. One more dive.';
      $('#finalTime').textContent = formatTime(game.time); $('#finalKills').textContent = game.kills; $('#finalShells').textContent = game.shells;
      $('#newBest').textContent = best ? '↗ NEW PERSONAL ELIMINATION RECORD' : `PERSONAL BEST · ${record.kills} ELIMINATED`;
      fetch('/api/score', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score: game.kills }) }).catch(() => {});
    } else if (event.type !== 'state') tone(event.type);
  }
  if (game.state !== lastState) sync();
}
function hud() {
  const p = game.player;
  $('#time').textContent = formatTime(game.time); $('#depth').textContent = Math.floor(100 + Math.min(game.time, 300) * 6.3);
  const zone = Math.min(2, Math.floor(game.time / 100));
  $('#biome').textContent = ['THE SUNLIT ZONE', 'THE TWILIGHT ZONE', 'THE MIDNIGHT ZONE'][zone];
  if (zone !== lastZone) { lastZone = zone; toast(`ENTERING ${$('#biome').textContent}`); }
  $('#kills').textContent = game.kills; $('#shells').textContent = game.shells;
  $('#level').textContent = String(game.level).padStart(2, '0'); $('#xp').textContent = `${game.xp} / ${game.nextXp}`;
  $('#hpText').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`; $('#hpBar').style.width = `${clamp(p.hp / p.maxHp * 100, 0, 100)}%`;
  $('#hpBar').style.background = p.hp < p.maxHp * .3 ? '#ff8b7e' : '#d3ed8b'; $('#xpBar').style.width = `${clamp(game.xp / game.nextXp * 100, 0, 100)}%`;
  $('#dashBtn').disabled = p.dashCooldown > 0 || game.state !== 'playing'; $('#dashText').textContent = p.dashCooldown > 0 ? `${p.dashCooldown.toFixed(1)}s RECHARGING` : 'SPACE · READY';
  const boss = game.enemies.find(e => e.boss); $('#bossHud').classList.toggle('hidden', !boss);
  if (boss) { $('#bossHp').textContent = `${Math.ceil(boss.hp / boss.maxHp * 100)}%`; $('#bossBar').style.width = `${boss.hp / boss.maxHp * 100}%`; }
}
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  if (game.state === 'playing' || game.state === 'menu') clock += dt;
  const input = { x: stick.x + Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')), y: stick.y + Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')) };
  game.update(dt, input); processEvents(); renderer.draw(game, clock); hud(); requestAnimationFrame(frame);
}
sync(); requestAnimationFrame(frame);
