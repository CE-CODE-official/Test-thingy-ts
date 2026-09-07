const field = document.querySelector('#playfield')
const turtle = document.querySelector('#turtle')
const scoreEl = document.querySelector('#score')
const bestEl = document.querySelector('#best')
const timerEl = document.querySelector('#timer')
const message = document.querySelector('#message')
let player = { x: 34, y: 210 }, score = 0, playing = false, shells = [], timeLeft = 45, clock

async function loadBest() { try { bestEl.textContent = (await fetch('/api/score').then(r => r.json())).bestScore } catch {} }
async function saveBest() { try { bestEl.textContent = (await fetch('/api/score', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ score }) }).then(r => r.json())).bestScore } catch {} }
function placeShells() { shells.forEach(s => s.remove()); shells = Array.from({ length: 12 }, (_, i) => { const shell = document.createElement('button'); shell.className = 'shell-item'; shell.type = 'button'; shell.textContent = i % 3 === 0 ? '🐚' : '🪸'; shell.style.left = `${90 + Math.random() * (field.clientWidth - 150)}px`; shell.style.top = `${72 + Math.random() * (field.clientHeight - 150)}px`; shell.addEventListener('click', () => collect(shell)); field.append(shell); return shell }) }
function finish(text) { playing = false; clearInterval(clock); message.textContent = text; saveBest(); document.querySelector('#startButton').textContent = 'Play again →' }
function collect(shell) { if (!playing || !shell.isConnected) return; shell.remove(); score++; scoreEl.textContent = score; message.textContent = score === 12 ? 'You did it! Beach legend.' : ['Plop! Nice shell.','Shell yeah!','A treasure!','Keep swimming!'][score % 4]; if (score === 12) finish('You did it! Beach legend.') }
function render() { turtle.style.left = `${player.x}px`; turtle.style.top = `${player.y}px` }
function move(direction) { if (!playing) return; const distance = 22; if (direction === 'left') player.x -= distance; if (direction === 'right') player.x += distance; if (direction === 'up') player.y -= distance; if (direction === 'down') player.y += distance; player.x = Math.max(0, Math.min(field.clientWidth - 58, player.x)); player.y = Math.max(0, Math.min(field.clientHeight - 54, player.y)); render(); shells.forEach(shell => { const x = Number.parseFloat(shell.style.left), y = Number.parseFloat(shell.style.top); if (Math.abs(x - player.x) < 35 && Math.abs(y - player.y) < 35) collect(shell) }) }
function start() { clearInterval(clock); score = 0; timeLeft = 45; scoreEl.textContent = '0'; timerEl.textContent = timeLeft; player = { x: 34, y: field.clientHeight / 2 }; playing = true; message.textContent = 'Go, Pebble, go!'; placeShells(); render(); field.focus(); document.querySelector('#startButton').textContent = 'Restart tide →'; clock = setInterval(() => { if (!playing) return; timerEl.textContent = --timeLeft; if (timeLeft <= 0) finish(`Tide's in! You found ${score} shells.`) }, 1000) }
document.querySelector('#startButton').addEventListener('click', () => { document.querySelector('#game').scrollIntoView({ behavior: 'smooth' }); setTimeout(start, 450) })
document.querySelector('#resetButton').addEventListener('click', start)
document.addEventListener('keydown', e => { const direction = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]; if (direction) { e.preventDefault(); move(direction) } })
document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => move(button.dataset.move)))
const dialog = document.querySelector('#helpDialog'); document.querySelector('#howTo').onclick = () => dialog.showModal(); document.querySelector('#closeDialog').onclick = () => dialog.close(); loadBest()
